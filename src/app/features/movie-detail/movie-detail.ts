import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PeliculasService } from '../../core/services/pelicula.service';
import { ResenasService, ResenaItem } from '../../core/services/resenas.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  templateUrl: './movie-detail.html',
  styleUrl: './movie-detail.css'
})
export class MovieDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private peliculaService = inject(PeliculasService);
  private resenasService = inject(ResenasService);
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService).client;

  pelicula = signal<any>(null);
  funciones = signal<any[]>([]);
  resenas = signal<ResenaItem[]>([]);
  promedioResenas = signal<number>(0);
  cargando = signal(true);

  nuevaPuntuacion = signal<number>(5);
  nuevoComentario = signal<string>('');
  enviandoResena = signal<boolean>(false);

  enPreventa = computed(() => {
    return Boolean(this.pelicula()?.es_preventa);
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.cargarPeliculaYResenas(id);
    }
  }

  async cargarPeliculaYResenas(id: string) {
    try {
      const [peliculaData, datosResenas] = await Promise.all([
        this.peliculaService.obtenerPeliculaPorId(id),
        this.resenasService.obtenerResenasPorPelicula(id)
      ]);

      this.pelicula.set(peliculaData);
      this.resenas.set(datosResenas.resenas);
      this.promedioResenas.set(datosResenas.promedio);

      const { data: funcionesData } = await this.supabase
        .from('funciones')
        .select('*')
        .eq('pelicula_id', id)
        .order('fecha_hora', { ascending: true });

      this.funciones.set(funcionesData || []);
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      this.cargando.set(false);
    }
  }

  irASeleccionButacas(funcionId: string) {
    this.router.navigate(['/reserva', funcionId]);
  }

  async enviarResena() {
    const user = this.authService.currentUser();
    const peli = this.pelicula();

    if (!user) {
      alert('Debes iniciar sesión para dejar una reseña.');
      this.router.navigate(['/login']);
      return;
    }

    if (!this.nuevoComentario().trim()) {
      alert('Por favor escribe un comentario.');
      return;
    }

    this.enviandoResena.set(true);
    try {
      await this.resenasService.agregarResena({
        pelicula_id: peli.id,
        user_id: user.id,
        puntuacion: this.nuevaPuntuacion(),
        comentario: this.nuevoComentario().trim()
      });

      this.nuevoComentario.set('');
      this.nuevaPuntuacion.set(5);

      const datosActualizados = await this.resenasService.obtenerResenasPorPelicula(peli.id);
      this.resenas.set(datosActualizados.resenas);
      this.promedioResenas.set(datosActualizados.promedio);
      alert('¡Reseña publicada con éxito!');
    } catch (err: any) {
      alert(`Error al publicar reseña: ${err.message}`);
    } finally {
      this.enviandoResena.set(false);
    }
  }
}