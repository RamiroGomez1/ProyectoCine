import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';

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
  imports: [CommonModule, RouterLink],
  templateUrl: './candybar.html',
  styleUrl: './candybar.css'
})
export class CandybarComponent implements OnInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private carritoService = inject(CarritoService);

  // Propiedad requerida por el botón "Volver a Selección de Butacas" en candybar.html
  funcionId = signal<string | null>(null);

  productos = signal<ProductoCandyBar[]>([
    { id: 'c1', nombre: 'Combo Mega (Pochoclos + 2 Gaseosas)', precio: 7500, imagenUrl: 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=400', categoria: 'Combos', descripcion: 'Balde gigante de pochoclos y dos gaseosas de 750ml.' },
    { id: 'c2', nombre: 'Pochoclos Grandes Dulces', precio: 4200, imagenUrl: 'https://images.unsplash.com/photo-1585647347483-22b66260dfff?w=400', categoria: 'Pochoclos', descripcion: 'Pochoclos crocantes recién hechos.' },
    { id: 'c3', nombre: 'Gaseosa Grande 750ml', precio: 2800, imagenUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=400', categoria: 'Bebidas', descripcion: 'Gaseosa línea Coca-Cola bien fría.' },
    { id: 'c4', nombre: 'Nachos con Queso Cheddar Caliente', precio: 5000, imagenUrl: 'https://images.unsplash.com/photo-1513456852971-30c0b8199d4d?w=400', categoria: 'Snacks', descripcion: 'Crujientes nachos acompañados de dip de queso cheddar.' }
  ]);

  carritoCantidades = signal<{ [key: string]: number }>({});

  ngOnInit() {
    const idUrl = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('funcionId');

    const rawReserva = sessionStorage.getItem('reserva_activa');
    const reserva = rawReserva ? JSON.parse(rawReserva) : null;

    this.funcionId.set(idUrl || reserva?.funcion_id || '');
  }

  obtenerCantidad(prod: ProductoCandyBar): number {
    return this.carritoCantidades()[prod.id] || 0;
  }

  agregarProducto(prod: ProductoCandyBar) {
    const actual = this.carritoCantidades();
    this.carritoCantidades.set({ ...actual, [prod.id]: (actual[prod.id] || 0) + 1 });
  }

  removerProducto(prod: ProductoCandyBar) {
    const actual = this.carritoCantidades();
    const cant = actual[prod.id] || 0;
    if (cant <= 0) return;
    const nuevo = { ...actual };
    if (cant === 1) delete nuevo[prod.id];
    else nuevo[prod.id] = cant - 1;
    this.carritoCantidades.set(nuevo);
  }

  totalItems = computed(() => {
    return Object.values(this.carritoCantidades()).reduce((acc, qty) => acc + qty, 0);
  });

  subtotalCandy = computed(() => {
    return Object.entries(this.carritoCantidades()).reduce((acc, [id, cant]) => {
      const p = this.productos().find(item => item.id === id);
      return acc + (p ? p.precio * cant : 0);
    }, 0);
  });

  continuarCompra() {
    Object.entries(this.carritoCantidades()).forEach(([id, cant]) => {
      const p = this.productos().find(item => item.id === id);
      if (p && cant > 0) {
        this.carritoService.agregarItem({
          tipo: 'candy',
          id: p.id,
          nombre: p.nombre,
          precio: p.precio,
          cantidad: cant
        });
      }
    });

    this.router.navigate(['/resumen']);
  }
}