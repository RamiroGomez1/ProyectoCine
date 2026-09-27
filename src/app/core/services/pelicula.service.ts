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

  async agregarPelicula(nuevaPelicula: Omit<Pelicula, 'id'>, imagenFile?: File): Promise<void> {
    let portadaUrl = nuevaPelicula.portadaUrl;

    if (imagenFile) {
      const nombreArchivo = `${Date.now()}_${imagenFile.name}`;
      const { error: uploadError } = await this.supabase.storage
        .from('peliculas')
        .upload(nombreArchivo, imagenFile);

      if (uploadError) throw uploadError;

      const { data: urlData } = this.supabase.storage
        .from('peliculas')
        .getPublicUrl(nombreArchivo);

      portadaUrl = urlData.publicUrl;
    }

    const { error } = await this.supabase
      .from('peliculas')
      .insert({
        titulo: nuevaPelicula.titulo,
        sinopsis: nuevaPelicula.sinopsis,
        duracionMinutos: nuevaPelicula.duracionMinutos,
        portadaUrl: portadaUrl,
        generos: nuevaPelicula.generos,
        formato: nuevaPelicula.formato,
        idioma: nuevaPelicula.idioma,
        clasificacionEdad: nuevaPelicula.clasificacionEdad,
        precioBase: nuevaPelicula.precioBase,
        esPreventa: nuevaPelicula.esPreventa ?? false
      });

    if (error) {
      console.error('Error al insertar la película:', error.message);
      throw error;
    }
  }

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

  async obtenerPeliculas() {
    const { data, error } = await this.supabase.from('peliculas').select('*');
    if (error) throw error;
    return data;
  }

  async obtenerTop3Vendidas() {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select('*')
      .order('entradas_vendidas', { ascending: false })
      .limit(3);

    if (error) throw error;
    return data;
  }

}