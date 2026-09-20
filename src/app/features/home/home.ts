import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MovieCardComponent } from '../../shared/movie-card';
import { PeliculasService } from '../../core/services/pelicula.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, MovieCardComponent],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private peliculasService = inject(PeliculasService);

  busqueda = signal<string>('');
  generoSeleccionado = signal<string>('');

  peliculas = this.peliculasService.peliculas;
  cargando = this.peliculasService.cargando;

  peliculasFiltradas = computed(() => {
    let resultado = this.peliculas();
    const termino = this.busqueda().toLowerCase().trim();
    const genero = this.generoSeleccionado();

    if (termino) {
      resultado = resultado.filter(p => 
        p.titulo.toLowerCase().includes(termino) || 
        p.sinopsis?.toLowerCase().includes(termino)
      );
    }

    if (genero) {
      resultado = resultado.filter(p => 
        p.generos.includes(genero)
      );
    }

    return resultado;
  });

  generosDisponibles = computed(() => {
    const todosLosGeneros = this.peliculas().flatMap(p => p.generos);
    return [...new Set(todosLosGeneros)].sort();
  });

  ngOnInit(): void {
    this.peliculasService.cargarPeliculas();
  }
}
