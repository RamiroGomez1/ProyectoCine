import { Component, OnInit, signal, computed, inject } from '@angular/core'; 
import { ActivatedRoute, RouterLink, Router } from '@angular/router'; 
import { ProductoCandyBar } from '../../core/models/candybar.interface'; 

@Component({ 
  selector: 'app-candybar', 
  standalone: true, 
  imports: [RouterLink], 
  templateUrl: './candybar.html', 
  styleUrl: './candybar.css' 
}) 
export class CandybarComponent implements OnInit { 
  private route = inject(ActivatedRoute); 
  private router = inject(Router); 

  funcionId = signal<string | null>(null);

  productos = signal<ProductoCandyBar[]>([]);

  carrito = signal<{ productoId: string, cantidad: number }[]>([]);

  totalCandybar = computed(() => {
    let total = 0;
    const items = this.carrito();
    const catalogo = this.productos();

    items.forEach(item => {
      const prod = catalogo.find(p => p.id === item.productoId);
      if (prod) {
        total += prod.precio * item.cantidad;
      }
    });
    return total;
  });

  ngOnInit() {
    this.funcionId.set(this.route.snapshot.paramMap.get('id'));

    /*
    this.productos.set([
      { id: '1', nombre: 'Combo Familiar', descripcion: '2 Pochoclos + 4 Gaseosas', precio: 12000, imagenUrl: '...' },
      { id: '2', nombre: 'Nachos', descripcion: 'Porción grande con salsa cheddar', precio: 4500, imagenUrl: '...' }
    ]);
    */
  }

  obtenerCantidad(productoId: string): number {
    const item = this.carrito().find(i => i.productoId === productoId);
    return item ? item.cantidad : 0;
  }

  incrementar(productoId: string) {
    const itemsActuales = this.carrito();
    const index = itemsActuales.findIndex(i => i.productoId === productoId);

    if (index >= 0) {
      const nuevosItems = [...itemsActuales];
      nuevosItems[index].cantidad++;
      this.carrito.set(nuevosItems);
    } else {
      this.carrito.set([...itemsActuales, { productoId, cantidad: 1 }]);
    }
  }

  decrementar(productoId: string) {
    const itemsActuales = this.carrito();
    const index = itemsActuales.findIndex(i => i.productoId === productoId);

    if (index >= 0) {
      const nuevosItems = [...itemsActuales];
      nuevosItems[index].cantidad--;
      
      if (nuevosItems[index].cantidad === 0) {
        nuevosItems.splice(index, 1);
      }
      this.carrito.set(nuevosItems);
    }
  }

  continuarCompra() {
    this.router.navigate(['/checkout', this.funcionId()]);
  }
}