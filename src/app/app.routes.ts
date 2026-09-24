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
    path: 'login', 
    loadComponent: () => import('./features/auth/login/login').then(m => m.LoginComponent) 
  },
  { 
    path: 'register', 
    loadComponent: () => import('./features/auth/register/register').then(m => m.RegisterComponent) 
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
    path: 'candybar', 
    loadComponent: () => import('./features/candybar/candybar').then(m => m.CandybarComponent) 
  },
  { 
    path: 'resumen', 
    loadComponent: () => import('./features/resumen/resumen').then(m => m.ResumenComponent) 
  },
  { 
    path: '**', 
    redirectTo: 'home' 
  }
];
