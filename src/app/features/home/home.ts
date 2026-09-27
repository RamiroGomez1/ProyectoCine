import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/services/pelicula.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, RouterLink], // Necesarios para el input y la navegación
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private peliculaService = inject(PeliculasService);

  peliculas = signal<any[]>([]);
  top3Vendidas = signal<any[]>([]);
  cargando = signal(true);
  
  filtroGenero = signal<string>('');

  peliculasFiltradas = computed(() => {
    const busqueda = this.filtroGenero().toLowerCase().trim();
    if (!busqueda) return this.peliculas();

    return this.peliculas().filter(peli =>
      peli.generos.some((g: string) => g.toLowerCase().includes(busqueda))
    );
  });

  async ngOnInit() {
    try {
      const [top3, todas] = await Promise.all([
        this.peliculaService.obtenerTop3Vendidas(),
        this.peliculaService.obtenerPeliculas()
      ]);

      this.top3Vendidas.set(top3);
      this.peliculas.set(todas);
    } catch (error) {
      console.error("Error cargando la cartelera", error);
    } finally {
      this.cargando.set(false);
    }
  }
}