import { Component, OnInit, signal, inject } from '@angular/core'; 
import { ActivatedRoute, RouterLink, Router } from '@angular/router'; 
import { DatePipe } from '@angular/common'; 
import { Pelicula } from '../../core/models/pelicula.interface'; 
import { Funcion } from '../../core/models/funcion.interface'; 

@Component({ 
  selector: 'app-movie-detail', 
  standalone: true, 
  imports: [RouterLink, DatePipe], 
  templateUrl: './movie-detail.html', 
  styleUrl: './movie-detail.css' 
}) 
export class MovieDetailComponent implements OnInit { 
  private route = inject(ActivatedRoute); 
  private router = inject(Router); 

  pelicula = signal<Pelicula | null>(null);

  funciones = signal<Funcion[]>([]);

  ngOnInit() {
    const movieId = this.route.snapshot.paramMap.get('id');

    if (movieId) {
    }
  }

  seleccionarFuncion(funcionId: string) {
    this.router.navigate(['/reserva/butacas', funcionId]);
  }
}