import { Injectable, signal, computed } from '@angular/core';

export interface ItemCarrito {
  tipo: 'entrada' | 'candy';
  id: string | number;
  nombre: string;
  precio: number;
  cantidad: number;
}

@Injectable({ providedIn: 'root' })
export class CarritoService {
  items = signal<ItemCarrito[]>([]);

  total = computed(() => {
    return this.items().reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
  });

  agregarItem(item: ItemCarrito) {
    this.items.update(actuales => {
      const existe = actuales.find(i => i.id === item.id && i.tipo === item.tipo);
      if (existe) {
        return actuales.map(i => i.id === item.id && i.tipo === item.tipo 
          ? { ...i, cantidad: i.cantidad + item.cantidad } 
          : i
        );
      }
      return [...actuales, item];
    });
  }

  limpiarCarrito() {
    this.items.set([]);
  }
}