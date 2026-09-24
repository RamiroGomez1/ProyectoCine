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

  totalPagar = computed(() => {
    const totalEntradas = this.asientos().reduce((acc, asiento) => acc + asiento.precio, 0);
    const totalSnacks = this.candybar().reduce((acc, item) => acc + item.subtotal, 0);
    return totalEntradas + totalSnacks;
  });

  ngOnInit() {
    this.funcionId.set(this.route.snapshot.paramMap.get('id'));

    
    /*
    this.peliculaTitulo.set('Deadpool & Wolverine');
    this.funcionFecha.set(new Date());
    this.asientos.set([
      { id: '1', fila: 'G', numero: 14, precio: 5000 },
      { id: '2', fila: 'G', numero: 15, precio: 5000 }
    ]);
    this.candybar.set([
      { nombre: 'Combo Familiar', cantidad: 1, subtotal: 12000 }
    ]);
    */
  }

  confirmarCompra() {
    if (!this.funcionId()) return;

    // this.reservaService.confirmarReserva().then(() => )
    
    alert('¡Compra confirmada! Prepará los pochoclos');
    
    this.router.navigate(['/']);
  }
}