import { Component, signal, computed, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router, ActivatedRoute } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';
import { ProductoService } from '../../core/services/producto-service';
import { ProductoCandyBar } from '../../core/models/producto.candybar.interface';

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
  private productoService = inject(ProductoService);

  funcionId = signal<string | null>(null);
  productos = signal<ProductoCandyBar[]>([]);
  cargando = signal(true);

  carritoCantidades = signal<{ [key: string]: number }>({});

  async ngOnInit() {
    const idUrl = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('funcionId');
    const rawReserva = sessionStorage.getItem('reserva_activa');
    const reserva = rawReserva ? JSON.parse(rawReserva) : null;
    this.funcionId.set(idUrl || reserva?.funcion_id || '');

    await this.cargarProductosDesdeDB();
  }

  async cargarProductosDesdeDB() {
    this.cargando.set(true);
    try {
      const data = await this.productoService.obtenerProductos();
      this.productos.set(data);
    } catch (error) {
      console.error('Error al cargar productos del Candy Bar:', error);
    } finally {
      this.cargando.set(false);
    }
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