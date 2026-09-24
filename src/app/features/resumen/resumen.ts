import { Component, OnInit, signal, computed, inject } from '@angular/core'; 
import { ActivatedRoute, RouterLink, Router } from '@angular/router'; 
import { FormsModule } from '@angular/forms'; 
import { DatePipe, CurrencyPipe } from '@angular/common'; 

@Component({ 
  selector: 'app-resumen', 
  standalone: true, 
  imports: [RouterLink, FormsModule, DatePipe, CurrencyPipe], 
  templateUrl: './resumen.html', 
  styleUrl: './resumen.css' 
}) 
export class ResumenComponent implements OnInit { 
  private route = inject(ActivatedRoute); 
  private router = inject(Router); 

  funcionId = signal<string | null>(null);

  peliculaTitulo = signal<string>('Cargando...');
  funcionFecha = signal<Date | null>(null);
  
  asientos = signal<{ id: string, fila: string, numero: number, precio: number }[]>([]);
  candybar = signal<{ nombre: string, cantidad: number, subtotal: number }[]>([]);

  metodoPago = signal<string>('tarjeta');

  codigoCupon = '';
  mensajeCupones = signal<string | null>(null);
  descuentoAplicado = signal<number>(0); // Guardará el porcentaje (ej: 15)

  subtotalGeneral = computed(() => {
    const totalEntradas = this.asientos().reduce((acc, asiento) => acc + asiento.precio, 0);
    const totalSnacks = this.candybar().reduce((acc, item) => acc + item.subtotal, 0);
    return totalEntradas + totalSnacks;
  });

  montoDescuento = computed(() => {
    return (this.subtotalGeneral() * this.descuentoAplicado()) / 100;
  });

  precioFinal = computed(() => {
    return this.subtotalGeneral() - this.montoDescuento();
  });

  totalEntradasMonto = computed(() => {
    return this.asientos().reduce((acc, asiento) => acc + asiento.precio, 0);
  });

  reservaMock = computed(() => {
    return {
      peliculaTitulo: this.peliculaTitulo(),
      sala: 'Sala 1',
      formato: '2D',
      idioma: 'Castellano',
      fechaHora: this.funcionFecha() || new Date(),
      butacas: this.asientos().map(a => `${a.fila}${a.numero}`), 
      precioButacas: this.totalEntradasMonto(),
      candybarItems: this.candybar().map(item => ({
        nombre: item.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.cantidad > 0 ? item.subtotal / item.cantidad : 0
      })),
      codigoTicket: 'A9X7-44PL' 
    };
  });

  ngOnInit() {
    this.funcionId.set(this.route.snapshot.paramMap.get('id'));
  }

  aplicarCupon(): void {
    if (this.codigoCupon.toUpperCase() === 'PROMO15') {
      this.descuentoAplicado.set(15);
      this.mensajeCupones.set('¡Cupón del 15% aplicado con éxito!');
    } else {
      this.mensajeCupones.set('El código de cupón no es válido.');
    }
  }

  confirmarCompra() {
    if (!this.funcionId()) return;
    alert('¡Compra confirmada! Prepará los pochoclos');
    this.router.navigate(['/']);
  }
}
