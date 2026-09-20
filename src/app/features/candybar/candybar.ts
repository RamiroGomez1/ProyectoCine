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
  carrito = signal<{ producto: ProductoCandyBar; cantidad: number }[]>([]);

  totalPagar = computed(() => {
    return this.carrito().reduce((total, item) => total + item.producto.precio * item.cantidad, 0);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('funcionId');
    this.funcionId.set(id);
    this.cargarProductosCandybar();
  }

  cargarProductosCandybar(): void {
    // Aquí cargarías los combos y productos desde tu servicio
  }

  agregarProducto(producto: ProductoCandyBar): void {
    this.carrito.update(items => {
      const existe = items.find(item => item.producto.id === producto.id);
      if (existe) {
        return items.map(item => 
          item.producto.id === producto.id 
            ? { ...item, cantidad: item.cantidad + 1 } 
            : item
        );
      }
      return [...items, { producto, cantidad: 1 }];
    });
  }

  removerProducto(producto: ProductoCandyBar): void {
    this.carrito.update(items => {
      const existe = items.find(item => item.producto.id === producto.id);
      if (!existe) return items;

      if (existe.cantidad === 1) {
        return items.filter(item => item.producto.id !== producto.id);
      }

      return items.map(item => 
        item.producto.id === producto.id 
          ? { ...item, cantidad: item.cantidad - 1 } 
          : item
      );
    });
  }
}
