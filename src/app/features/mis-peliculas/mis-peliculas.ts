import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { ResenasService } from '../../core/services/resenas.service';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../core/services/modal.service';

export interface PeliculaVista {
  reservaId: string;
  peliculaId: string;
  titulo: string;
  portadaUrl: string;
  fecha: string;
  puntuacion?: number;
  comentario?: string;
}

@Component({
  selector: 'app-mis-peliculas',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe, RouterLink],
  templateUrl: './mis-peliculas.html',
  styleUrl: './mis-peliculas.css'
})
export class MisPeliculasComponent implements OnInit {
  private supabase = inject(SupabaseService).client;
  private modal = inject(ModalService);
  private resenasService = inject(ResenasService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  peliculas = signal<PeliculaVista[]>([]);
  cargando = signal(true);

  calificandoId = signal<string | null>(null);
  comentarioControl = this.fb.control('', [Validators.required, Validators.maxLength(200)]);
  estrellasControl = this.fb.control(5, [Validators.required, Validators.min(1), Validators.max(5)]);

  async ngOnInit() {
    await this.cargarHistorial();
  }

  async cargarHistorial() {
    const user = this.authService.currentUser();
    if (!user) return;

    this.cargando.set(true);

    const { data: reservas, error } = await this.supabase
      .from('reservas')
      .select('id, estado, funciones(fecha_hora, peliculas(id, titulo, portada_url))')
      .eq('usuario_id', user.id)
      .in('estado', ['confirmada', 'usada']);

    if (error) {
      console.error('Error al cargar el historial:', error.message);
      this.cargando.set(false);
      return;
    }

    const resenas = await this.resenasService.obtenerHistorialUsuario(user.id);
    const ahora = new Date();

    // solo las funciones que ya pasaron o las entradas que ya se usaron
    const vistas = (reservas || [])
      .filter((r: any) => r.funciones && (r.estado === 'usada' || new Date(r.funciones.fecha_hora) < ahora))
      .map((r: any) => {
        const peli = r.funciones.peliculas;
        const resena = resenas.find(res => res.pelicula_id === peli?.id);
        return {
          reservaId: r.id,
          peliculaId: peli?.id,
          titulo: peli?.titulo,
          portadaUrl: peli?.portada_url,
          fecha: r.funciones.fecha_hora,
          puntuacion: resena?.puntuacion,
          comentario: resena?.comentario
        };
      })
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

    this.peliculas.set(vistas);
    this.cargando.set(false);
  }

  iniciarCalificacion(peli: PeliculaVista) {
    this.calificandoId.set(peli.reservaId);
    this.comentarioControl.reset('');
    this.estrellasControl.setValue(5);
  }

  cancelar() {
    this.calificandoId.set(null);
  }

  async guardarCalificacion(peli: PeliculaVista) {
    const user = this.authService.currentUser();
    if (!user || this.comentarioControl.invalid) return;

    try {
      await this.resenasService.agregarResena({
        pelicula_id: peli.peliculaId,
        user_id: user.id,
        puntuacion: Number(this.estrellasControl.value) || 5,
        comentario: this.comentarioControl.value || ''
      });

      this.calificandoId.set(null);
      await this.cargarHistorial();
    } catch (err: any) {
      console.error(err);
      this.modal.avisar('Error al guardar la calificación.');
    }
  }
}
