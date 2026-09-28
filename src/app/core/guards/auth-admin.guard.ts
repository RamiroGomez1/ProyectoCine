import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const user = authService.currentUser();

  if (user?.role === "admin") {
    return true;
  }
  
  console.log("Debes tener rol admin para acceder a esta ruta");
  return router.createUrlTree(['/home']);
};