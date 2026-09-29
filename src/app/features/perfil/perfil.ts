import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { Usuario } from '../../core/models/usuario.interface';
import { UpperCasePipe } from '@angular/common';

@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, UpperCasePipe],
  templateUrl: './perfil.html',
  styleUrl: './perfil.css'
})
export class PerfilComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService).client;

  usuario = signal<Usuario | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

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