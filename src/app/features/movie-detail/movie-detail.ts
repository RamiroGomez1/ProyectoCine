// Path: [Notebook sources]/src/app/features/movie-detail/movie-detail.ts
import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PeliculasService } from '../../core/services/pelicula.service';
import { ResenasService } from '../../core/services/resenas.service';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  templateUrl: './movie-detail.html',
  styleUrl: './movie-detail.css'
})
export class MovieDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private peliculaService = inject(PeliculasService);
  private resenasService = inject(ResenasService);

  // Signals para el estado reactivo[cite: 8]
  pelicula = signal<any>(null);
  promedioResenas = signal<number>(0);
  cargando = signal(true);

  // Computed Signal para determinar si aplica precio de preventa (7 días antes)[cite: 8]
  enPreventa = computed(() => {
    const peli = this.pelicula();
    if (!peli || !peli.fecha_estreno) return false;
    
    const hoy = new Date();
    const estreno = new Date(peli.fecha_estreno);
    const diffDias = (estreno.getTime() - hoy.getTime()) / (1000 * 3600 * 24);
    
    // Si faltan entre 0 y 7 días para el estreno, es preventa
    return diffDias > 0 && diffDias <= 7;
  });

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      try {
        const data = await this.peliculaService.obtenerPeliculaPorId(id);
        this.pelicula.set(data);

        const promedio = await this.resenasService.obtenerPromedioPelicula(id);
        this.promedioResenas.set(promedio);
      } catch (error) {
        console.error("Error al cargar la película", error);
      } finally {
        this.cargando.set(false);
      }
    }
  }

  continuarCompra() {
    this.router.navigate(['/seat-selection', this.pelicula().id]);
  }
}