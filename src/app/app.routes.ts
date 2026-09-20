import { Routes } from '@angular/router';

export const routes: Routes = [
  { 
    path: '', 
    redirectTo: 'home', 
    pathMatch: 'full' 
  },
  { 
    path: 'home', 
    loadComponent: () => import('./features/home/home').then(m => m.HomeComponent) 
  },
  { 
    path: 'pelicula/:id', 
    loadComponent: () => import('./features/movie-detail/movie-detail').then(m => m.MovieDetailComponent) 
  },
  { 
    path: 'reserva/:funcionId', 
    loadComponent: () => import('./features/seat-selection/seat-selection').then(m => m.SeatSelectionComponent) 
  },
  { 
    path: 'candybar/:funcionId', 
    loadComponent: () => import('./features/candybar/candybar').then(m => m.CandybarComponent) 
  },
  { 
    path: '**', 
    redirectTo: 'home' 
  }
];
