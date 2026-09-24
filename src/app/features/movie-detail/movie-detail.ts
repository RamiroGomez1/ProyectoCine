import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-movie-detail',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './movie-detail.html',
  styleUrl: './movie-detail.css'
})
export class MovieDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  
  movie臨Id = signal<string | null>(null);

  pelicula = signal<any>({
    titulo: 'Cargando película...',
    sinopsis: 'Cargando sinopsis de la película seleccionada.',
    genero: 'Acción / Aventura',
    duracion: '120 min',
    imagenUrl: 'assets/movie-placeholder.png'
  });

  funciones = signal<any[]>([
    { id: 'f1', hora: '14:30', sala: 'Sala 1', formato: '2D' },
    { id: 'f2', hora: '17:15', sala: 'Sala 3', formato: '3D' },
    { id: 'f3', hora: '20:00', sala: 'Sala 1', formato: '2D' }
  ]);

  funcionSeleccionada = signal<any>(null);

  ngOnInit() {
    this.movie臨Id.set(this.route.snapshot.paramMap.get('id'));
    
    this.pelicula.set({
      titulo: 'Deadpool & Wolverine',
      sinopsis: 'Un apático Wade Wilson se afana en la vida civil tras dejar atrás sus días como el mercenario Deadpool. Pero cuando su mundo natal se enfrenta a una amenaza existencial, Wade debe volver a ponerse el traje.',
      genero: 'Acción / Comedia',
      duracion: '127 min',
      imagenUrl: 'assets/deadpool-wolverine.png'
    });
  }

  seleccionarFuncion(funcion: any): void {
    this.funcionSeleccionada.set(funcion);
  }
}
