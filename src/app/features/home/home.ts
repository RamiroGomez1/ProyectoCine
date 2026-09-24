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
  busqueda = signal<string>('');
  
  generoSeleccionado = signal<string>('');

  generosDisponibles = ['Acción', 'Aventura', 'Comedia', 'Drama', 'Ciencia Ficción', 'Terror', 'Animación'];

  peliculas = signal<Pelicula[]>([]);

  peliculasFiltradas = computed(() => {
    const terminoBusqueda = this.busqueda().toLowerCase().trim();
    const genero = this.generoSeleccionado();

    return this.peliculas().filter(pelicula => {
      const coincideTexto = pelicula.titulo.toLowerCase().includes(terminoBusqueda);
      
      const coincideGenero = genero === '' || pelicula.generos.includes(genero);

      return coincideTexto && coincideGenero;
    });
  });
}