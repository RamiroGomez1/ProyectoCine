import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Resena } from '../models/resena.interface';

@Injectable({
  providedIn: 'root'
})
export class ResenasService {
  private supabase = inject(SupabaseService).client;

  async obtenerResenasPorPelicula(peliculaId: string): Promise<{ resenas: Resena[], promedio: number }> {
    const { data, error } = await this.supabase
      .from('resenas')
      .select('*, usuarios(nombre, apellido)')
      .eq('pelicula_id', peliculaId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error al obtener reseñas:', error.message);
      return { resenas: [], promedio: 0 };
    }

    const resenas = data as Resena[];
    let promedio = 0;

    if (resenas.length > 0) {
      const suma = resenas.reduce((acc, curr) => acc + curr.puntuacion, 0);
      promedio = Number((suma / resenas.length).toFixed(1));
    }

    return { resenas, promedio };
  }

  async agregarResena(resena: { pelicula_id: string; user_id: string; puntuacion: number; comentario: string }) {
    const { data, error } = await this.supabase
      .from('resenas')
      .insert([resena])
      .select()
      .single();

    if (error) {
      console.error('Error al guardar reseña:', error.message);
      throw error;
    }

    return data;
  }

  async obtenerPromedioPelicula(peliculaId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('resenas')
      .select('puntuacion')
      .eq('pelicula_id', peliculaId);

    if (error || !data || data.length === 0) return 0;
    const suma = data.reduce((acc, curr) => acc + curr.puntuacion, 0);
    return Number((suma / data.length).toFixed(1));
  }

  async obtenerHistorialUsuario(userId: string) {
    const { data, error } = await this.supabase
      .from('resenas')
      .select('*, peliculas(*)')
      .eq('user_id', userId);

    if (error) {
      console.error('Error al obtener historial:', error.message);
      return [];
    }
    return data;
  }

}