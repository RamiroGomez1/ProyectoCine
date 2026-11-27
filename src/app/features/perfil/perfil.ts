import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Usuario } from '../../core/models/usuario.interface';
import { DatePipe, UpperCasePipe } from '@angular/common';
import { FidelizacionService } from '../../core/services/fidelizacion.service';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UpperCasePipe, DatePipe],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class PerfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private modal = inject(ModalService);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService).client;
  private fidelizacionService = inject(FidelizacionService);

  usuario = signal<Usuario | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  compras = signal<any[]>([]);
  canjes = signal<any[]>([]);

  tiposSangreDisponibles = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', '0+', '0-'];

  perfilForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    fechaNacimiento: ['', Validators.required],
    tipoSangre: ['', Validators.required],
    colorOjos: ['', Validators.required],
    diasVacaciones: [0, [Validators.required, Validators.min(0), Validators.max(365)]]
  });

  async ngOnInit() {
    await this.cargarDatosPerfil();
    await this.cargarComprasYCanjes();
  }

  async cargarComprasYCanjes() {
    const user = this.authService.currentUser();
    if (!user) return;

    const { data } = await this.supabase
      .from('reservas')
      .select('id, estado, total_pagar, asientos, fecha_compra, funciones(fecha_hora, peliculas(titulo))')
      .eq('usuario_id', user.id)
      .in('estado', ['confirmada', 'usada', 'cancelada'])
      .order('fecha_compra', { ascending: false });

    this.compras.set(data || []);
    this.canjes.set(await this.fidelizacionService.obtenerCanjes(user.id));
  }

  // se puede cancelar hasta 2 horas antes de la funcion
  sePuedeCancelar(compra: any): boolean {
    if (compra.estado !== 'confirmada' || !compra.funciones) return false;
    const horaFuncion = new Date(compra.funciones.fecha_hora).getTime();
    return horaFuncion - Date.now() >= 2 * 60 * 60 * 1000;
  }

  async cancelarCompra(compra: any) {
    const user = this.authService.currentUser();
    if (!user) return;
    if (!(await this.modal.confirmar(`¿Cancelar la compra? Se te van a acreditar $${compra.total_pagar} de saldo a favor.`))) return;

    try {
      await this.fidelizacionService.cancelarReservaYOtrogarCredito(compra.id, user.id);
      this.mensajeExito.set('Compra cancelada. El crédito ya está en tu cuenta.');
      await this.authService.cargarDatosUsuario(user.id);
      await this.cargarDatosPerfil();
      await this.cargarComprasYCanjes();
    } catch (err: any) {
      this.mensajeError.set(err.message);
    }
  }

  async cargarDatosPerfil() {
    this.cargando.set(true);
    const userAuth = this.authService.currentUser() as { id: string; email?: string } | null;

    if (!userAuth) {
      this.mensajeError.set('No se encontró una sesión activa.');
      this.cargando.set(false);
      return;
    }

    try {
      const { data, error } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('id', userAuth.id)
        .single();

      if (error) throw error;

      if (data) {
        const datosUsuario: Usuario = {
          id: data.id,
          email: data.email || userAuth.email || '',
          nombre: data.nombre || '',
          apellido: data.apellido || '',
          fechaNacimiento: data.fecha_nacimiento || data.fechaNacimiento || '',
          tipoSangre: data.tipo_sangre || data.tipoSangre || '',
          colorOjos: data.color_ojos || data.colorOjos || '',
          diasVacaciones: Number(data.dias_vacaciones ?? data.diasVacaciones ?? 0),
          puntosFidelidad: Number(data.puntos_fidelidad ?? data.puntosFidelidad ?? 0),
          saldoFavor: Number(data.saldo_favor ?? data.saldoFavor ?? 0),
          rol: data.rol || 'cliente'
        };

        this.usuario.set(datosUsuario);

        this.perfilForm.patchValue({
          nombre: datosUsuario.nombre,
          apellido: datosUsuario.apellido,
          fechaNacimiento: datosUsuario.fechaNacimiento,
          tipoSangre: datosUsuario.tipoSangre,
          colorOjos: datosUsuario.colorOjos,
          diasVacaciones: datosUsuario.diasVacaciones
        });
      }
    } catch (err: any) {
      console.error('Error al cargar perfil:', err);
      this.mensajeError.set('No se pudieron recuperar los datos del perfil.');
    } finally {
      this.cargando.set(false);
    }
  }

  async guardarCambios() {
    if (this.perfilForm.invalid || this.guardando()) return;

    this.guardando.set(true);
    this.mensajeExito.set(null);
    this.mensajeError.set(null);

    const f = this.perfilForm.getRawValue();
    const userAuth = this.authService.currentUser();

    if (!userAuth) {
      this.mensajeError.set('Debes iniciar sesión para actualizar los datos.');
      this.guardando.set(false);
      return;
    }

    try {
      const { error } = await this.supabase
        .from('usuarios')
        .update({
          nombre: f.nombre,
          apellido: f.apellido,
          fecha_nacimiento: f.fechaNacimiento,
          tipo_sangre: f.tipoSangre,
          color_ojos: f.colorOjos,
          dias_vacaciones: Number(f.diasVacaciones)
        })
        .eq('id', userAuth.id);

      if (error) throw error;

      this.mensajeExito.set('¡Tus datos de perfil fueron actualizados exitosamente!');

      this.usuario.update(u => {
        if (!u) return null;
        return {
          ...u,
          nombre: f.nombre || u.nombre,
          apellido: f.apellido || u.apellido,
          fechaNacimiento: f.fechaNacimiento || u.fechaNacimiento,
          tipoSangre: f.tipoSangre || u.tipoSangre,
          colorOjos: f.colorOjos || u.colorOjos,
          diasVacaciones: Number(f.diasVacaciones)
        };
      });
    } catch (err: any) {
      console.error('Error al actualizar perfil:', err);
      this.mensajeError.set(`Error al guardar: ${err.message || 'Intente más tarde.'}`);
    } finally {
      this.guardando.set(false);
    }
  }
}