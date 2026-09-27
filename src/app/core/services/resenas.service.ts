import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Resena {
  id?: number;
  pelicula_id: string;
  usuario_id: string;
  estrellas: number; 
  comentario: string; 
  fecha?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ResenasService {
  private supabase = inject(SupabaseService).client;

  // Guarda la reseña que deja el usuario 
  async agregarResena(resena: Resena): Promise<void> {
    const { error } = await this.supabase
      .from('resenas')
      .insert(resena);

    if (error) throw error;
  }

  async obtenerPromedioPelicula(peliculaId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('resenas')
      .select('estrellas')
      .eq('pelicula_id', peliculaId);

    if (error || !data || data.length === 0) return 0;

    const suma = data.reduce((acc, curr) => acc + curr.estrellas, 0);
    return Number((suma / data.length).toFixed(1));
  }

  async obtenerHistorialUsuario(usuarioId: string) {
    const { data, error } = await this.supabase
      .from('historial_vistas') 
      .select('pelicula_id, titulo, portadaUrl, fecha_funcion')
      .eq('usuario_id', usuarioId);

    if (error) throw error;
    return data;
  }
}