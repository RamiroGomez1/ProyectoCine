import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';

export interface ProductoCandyBar {
  id: string;
  nombre: string;
  precio: number;
  imagenUrl: string;   
  categoria: string;   
  descripcion: string; 
}

@Component({
  selector: 'app-candybar',
  standalone: true,
  imports: [CommonModule, RouterLink], // RouterLink agregado aquí
  templateUrl: './candybar.html',
  styleUrl: './candybar.css'
})
export class CandybarComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  funcionId = signal<string | null>(null);

  productos = signal<ProductoCandyBar[]>([
    { id: '1', nombre: 'Combo Pochoclos + Gaseosa', precio: 6000, imagenUrl: 'assets/combo1.png', categoria: 'Combos', descripcion: 'Pochoclos grandes más gaseosa gigante.' },
    { id: '2', nombre: 'Gaseosa Mediana', precio: 2500, imagenUrl: 'assets/gaseosa.png', categoria: 'Bebidas', descripcion: 'Gaseosa fría de 500ml.' },
    { id: '3', nombre: 'Chocolates', precio: 1800, imagenUrl: 'assets/chocolate.png', categoria: 'Dulces', descripcion: 'Barra de chocolate con leche.' }
  ]);

  carrito = signal<{ [key: string]: number }>({});

  ngOnInit() {
    this.funcionId.set(this.route.snapshot.paramMap.get('id'));
  }

  obtenerCantidad(prod: ProductoCandyBar): number {
    return this.carrito()[prod.id] || 0;
  }

  agregarProducto(prod: ProductoCandyBar): void {
    const actual = this.carrito();
    this.carrito.set({ ...actual, [prod.id]: (actual[prod.id] || 0) + 1 });
  }

  removerProducto(prod: ProductoCandyBar): void {
    const actual = this.carrito();
    const cantidadActual = actual[prod.id] || 0;
    if (cantidadActual <= 0) return;

    const nuevaEstructura = { ...actual };
    if (cantidadActual === 1) {
      delete nuevaEstructura[prod.id];
    } else {
      nuevaEstructura[prod.id] = cantidadActual - 1;
    }
    this.carrito.set(nuevaEstructura);
  }

  totalItems = computed(() => {
    return Object.values(this.carrito()).reduce((acc, qty) => acc + qty, 0);
  });

  subtotalCandy = computed(() => {
    return Object.entries(this.carrito()).reduce((acc, [id, qty]) => {
      const producto = this.productos().find(p => p.id === id);
      return acc + (producto ? producto.precio * qty : 0);
    }, 0);
  });

  continuarCompra(): void {
    this.router.navigate(['/resumen', this.funcionId()]);
  }
}
