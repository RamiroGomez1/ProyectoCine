import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authAdminGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const user = authService.currentUser();
  let userData = authService.currentUserData();

  if (!userData && user?.id) {
    await authService.cargarDatosUsuario(user.id);
    userData = authService.currentUserData();
  }

  if (userData?.rol === "admin") {
    return true;
  }

  console.log("Debes tener rol admin para acceder a esta ruta");
  return router.createUrlTree(['/home']);
};