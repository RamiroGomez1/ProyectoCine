import { Component, signal, computed } from '@angular/core'; 
import { FormsModule } from '@angular/forms'; 
import { Pelicula } from '../../core/models/pelicula.interface'; 
import { MovieCardComponent } from '../../shared/movie-card'; 
import { PeliculasService } from '../../core/services/pelicula.service'; 

@Component({ 
  selector: 'app-home', 
  standalone: true, 
  imports: [FormsModule, MovieCardComponent], 
  templateUrl: './home.html', 
  styleUrl: './home.css' 
}) 
export class HomeComponent { 
  constructor(private peliculasService: PeliculasService) {}

  busqueda = signal<string>('');
  
  generoSeleccionado = signal<string>('');

  generosDisponibles = ['Acción', 'Aventura', 'Comedia', 'Drama', 'Ciencia Ficción', 'Terror', 'Animación'];

  peliculas = signal<Pelicula[]>([]);

  peliculasFiltradas = computed(() => {
    const texto = this.busqueda().toLowerCase().trim();
    const genero = this.generoSeleccionado();

    return this.peliculasService.peliculas().filter(pelicula => {
      const coincideTexto = pelicula.titulo.toLowerCase().includes(texto);
      
      const coincideGenero = genero === '' || pelicula.generos.includes(genero);

      return coincideTexto && coincideGenero;
    });
  });
}