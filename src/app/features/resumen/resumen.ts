import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CarritoService } from '../../core/services/carrito.service';
import { CuponesService } from '../../core/services/cupones.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './resumen.html',
  styleUrl: './resumen.css'
})
export class ResumenComponent implements OnInit {
  carritoService = inject(CarritoService);
  private cuponesService = inject(CuponesService);
  private authService = inject(AuthService);

  peliculaActual = signal<any>({ restriccion: '+18' }); 
  
  codigoCupon = signal('');
  descuentoAplicado = signal(0);
  mensajeCupon = signal('');

  puedeComprar = signal(true);
  mensajeRestriccion = signal('');

  ngOnInit() {
    this.validarEdad();
  }

  validarEdad() {
    const restriccion = this.peliculaActual().restriccion;
    if (restriccion !== '+13' && restriccion !== '+18') return;

    const usuario = this.authService.currentUserData();
    if (!usuario) {
       this.puedeComprar.set(false);
       this.mensajeRestriccion.set(`Esta película es ${restriccion}. Debes iniciar sesión para verificar tu edad.`);
       return;
    }

    const edad = this.cuponesService.calcularEdad(usuario.fechaNacimiento);
    const edadMinima = restriccion === '+18' ? 18 : 13;

    if (edad < edadMinima) {
      this.puedeComprar.set(false);
      this.mensajeRestriccion.set(`No tienes la edad suficiente para comprar entradas para esta película (${restriccion}).`);
    }
  }

  aplicarCupon() {
    const total = this.carritoService.total();
    const resultado = this.cuponesService.validarCupon(this.codigoCupon(), total);
    
    this.mensajeCupon.set(resultado.mensaje);
    if (resultado.valido) {
      this.descuentoAplicado.set(resultado.descuento);
    } else {
      this.descuentoAplicado.set(0);
    }
  }

  finalizarCompra() {
    if (!this.puedeComprar()) return;
    
    const totalFinal = this.carritoService.total() - this.descuentoAplicado();
    console.log('Generando QR por el total de: $', totalFinal);
    // llamada a Supabase para crear la reserva, generar el hash del QR y vaciar el carrito
  }
}