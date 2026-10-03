import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ProductoCandyBar } from '../models/producto.candybar.interface';

@Injectable({
  providedIn: 'root'
})
export class ProductoService {
  private supabase = inject(SupabaseService).client;

  async obtenerProductos(): Promise<ProductoCandyBar[]> {
    const { data, error } = await this.supabase
      .from('productos_candy')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener productos de candy:', error.message);
      return [];
    }

    return (data || []).map((p: any) => ({
      id: p.id,
      nombre: p.nombre,
      descripcion: p.descripcion,
      precio: Number(p.precio),
      imagenUrl: p.imagen_url || 'https://images.unsplash.com/photo-1572177812156-58036aae439c?w=400',
      categoria: p.categoria,
      esCombo: Boolean(p.es_combo),
      costoEnPuntos: p.costo_en_puntos ?? 0
    }));
  }

  async crearProductoOCombo(producto: {
    nombre: string;
    descripcion: string;
    precio: number;
    categoria: 'Combos' | 'Pochoclos' | 'Bebidas' | 'Golosinas';
    es_combo: boolean;
    costo_en_puntos?: number;
    imagen_url?: string;
  }): Promise<{ exito: boolean; mensaje?: string }> {
    const { error } = await this.supabase
      .from('productos_candy')
      .insert([producto]);

    if (error) {
      return { exito: false, mensaje: error.message };
    }
    return { exito: true };
  }

  async actualizarProducto(id: string, cambios: Partial<ProductoCandyBar>): Promise<{ exito: boolean; mensaje?: string }> {
  const { error } = await this.supabase
    .from('productos_candy')
    .update({
      nombre: cambios.nombre,
      descripcion: cambios.descripcion,
      precio: cambios.precio,
      categoria: cambios.categoria,
      es_combo: cambios.esCombo,
      costo_en_puntos: cambios.costoEnPuntos,
      imagen_url: cambios.imagenUrl
    })
    .eq('id', id);

  if (error) return { exito: false, mensaje: error.message };
  return { exito: true };
}

async eliminarProducto(id: string): Promise<{ exito: boolean; mensaje?: string }> {
  const { error } = await this.supabase
    .from('productos_candy')
    .delete()
    .eq('id', id);

  if (error) return { exito: false, mensaje: error.message };
  return { exito: true };
}

}