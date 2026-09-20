import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Pelicula } from '../../core/models/pelicula.interface';
import { MovieCardComponent } from '../../shared/movie-card';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, MovieCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent {
  peliculas = signal<Pelicula[]>([]);
  busqueda = signal<string>('');

  peliculasFiltradas = computed(() => {
    const termino = this.busqueda().toLowerCase().trim();
    if (!termino) return this.peliculas();
    
    return this.peliculas().filter(p => 
      p.titulo.toLowerCase().includes(termino) || 
      p.generos.some(g => g.toLowerCase().includes(termino))
    );
  });
}
