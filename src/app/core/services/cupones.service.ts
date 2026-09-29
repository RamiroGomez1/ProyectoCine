import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class CuponesService {
  private auth = inject(AuthService);

  validarCupon(codigo: string, total: number): { valido: boolean, descuento: number, mensaje: string } {
    const usuario = this.auth.currentUserData();

    if (codigo === 'PRIMERACOMPRA') {
       if (!usuario) return { valido: false, descuento: 0, mensaje: 'Debes registrarte para usar este cupón.' };
       return { valido: true, descuento: total * 0.20, mensaje: '¡20% de descuento aplicado en tu primera compra!' };
    }

    if (codigo === 'MAYOR50') {
       if (!usuario || !usuario.fechaNacimiento) {
         return { valido: false, descuento: 0, mensaje: 'Debes iniciar sesión y tener tu fecha de nacimiento registrada.' };
       }
       
       const edad = this.calcularEdad(usuario.fechaNacimiento);
       if (edad < 50) {
         return { valido: false, descuento: 0, mensaje: 'Este cupón es exclusivo para mayores de 50 años.' };
       }
       
       return { valido: true, descuento: total * 0.30, mensaje: '¡Cupón MAYOR50 aplicado con éxito!' };
    }

    return { valido: false, descuento: 0, mensaje: 'Cupón inválido o expirado.' };
  }

  // calcular la edad exacta
  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const cumple = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const mes = hoy.getMonth() - cumple.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < cumple.getDate())) {
      edad--;
    }
    return edad;
  }
}