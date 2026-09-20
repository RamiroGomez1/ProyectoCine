import { Injectable, inject, signal, computed } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Pelicula } from '../models/pelicula.interface';

@Injectable({
  providedIn: 'root'
})
export class PeliculasService {
  private supabase = inject(SupabaseService).client;

  private peliculasSignal = signal<Pelicula[]>([]);
  private cargandoSignal = signal<boolean>(false);

  public peliculas = this.peliculasSignal.asReadonly();
  public cargando = this.cargandoSignal.asReadonly();

  async cargarPeliculas(): Promise<void> {
    this.cargandoSignal.set(true);
    try {
      const { data, error } = await this.supabase
        .from('peliculas')
        .select('*')
        .order('titulo', { ascending: true });

      if (error) throw error;

      if (data) {
        this.peliculasSignal.set(data as Pelicula[]);
      }
    } catch (err) {
      console.error('Error al cargar películas:', err);
    } finally {
      this.cargandoSignal.set(false);
    }
  }

  async obtenerPeliculaPorId(id: string): Promise<Pelicula | null> {
    try {
      const { data, error } = await this.supabase
        .from('peliculas')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data as Pelicula;
    } catch (err) {
      console.error(`Error al obtener película con ID ${id}:`, err);
      return null;
    }
  }
}
