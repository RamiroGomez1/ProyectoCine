import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface ResenaItem {
  id?: string;
  pelicula_id: string;
  user_id: string;
  puntuacion: number;
  comentario: string;
  created_at?: string;
  peliculas?: any;
}

@Injectable({
  providedIn: 'root'
})
export class ResenasService {
  private supabase = inject(SupabaseService).client;

  async obtenerResenasPorPelicula(peliculaId: string): Promise<{ resenas: ResenaItem[]; promedio: number }> {
    const { data, error } = await this.supabase
      .from('resenas')
      .select('*')
      .eq('pelicula_id', peliculaId)
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return { resenas: [], promedio: 0 };
    }

    const resenas = data as ResenaItem[];
    const suma = resenas.reduce((acc, curr) => acc + curr.puntuacion, 0);
    const promedio = Number((suma / resenas.length).toFixed(1));

    return { resenas, promedio };
  }

  async obtenerPromedioPelicula(peliculaId: string): Promise<number> {
    const res = await this.obtenerResenasPorPelicula(peliculaId);
    return res.promedio;
  }

  async obtenerHistorialUsuario(userId: string): Promise<ResenaItem[]> {
    const { data, error } = await this.supabase
      .from('resenas')
      .select('*, peliculas(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener historial del usuario:', error.message);
      return [];
    }

    return (data as ResenaItem[]) || [];
  }

  async agregarResena(resena: { pelicula_id: string; user_id: string; puntuacion: number; comentario: string }) {
    const { data, error } = await this.supabase
      .from('resenas')
      .insert([resena])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}