import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { authAdminGuard } from './core/guards/auth-admin.guard';

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
    path: 'favoritos', 
    loadComponent: () => import('./features/favoritos/favoritos').then(m => m.FavoritosComponent), 
    canActivate: [authGuard]
  },
  { 
    path: 'admin', 
    loadComponent: () => import('./features/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboardComponent), 
    canActivate: [authAdminGuard]
  },
  { 
    path: 'admin/agregar-pelicula', 
    loadComponent: () => import('./features/agregar-pelicula/agregar-pelicula').then(m => m.AgregarPeliculaComponent), 
    canActivate: [authAdminGuard]
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
  path: 'perfil',
  loadComponent: () => import('./features/perfil/perfil').then(m => m.PerfilComponent)
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
