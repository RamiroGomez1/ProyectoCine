import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class CineService {
  private supabase = inject(SupabaseService).client;

  async agregarPelicula(pelicula: {
    titulo: string;
    sinopsis: string;
    duracion_minutos: number;
    portada_url: string;
    generos: string[];
    formato: string;
    idioma: string;
    clasificacion_edad: number;
    precio_base: number;
    es_preventa: boolean;
  }) {
    const { data, error } = await this.supabase
      .from('peliculas')
      .insert([pelicula])
      .select()
      .single();

    if (error) {
      console.error('Error al insertar película:', error.message);
      alert('Error al guardar la película.');
      return false;
    }
    alert('¡Película agregada con éxito!');
    return true;
  }

  async agregarFuncion(funcion: {
    pelicula_id: string;
    sala: string;
    fecha_hora: string;
    precio: number;
    formato: string;
    idioma: string;
  }) {
    const { data: pelicula, error: pelError } = await this.supabase
      .from('peliculas')
      .select('duracion_minutos')
      .eq('id', funcion.pelicula_id)
      .single();

    if (pelError || !pelicula) {
      alert('No se pudo obtener la duración de la película.');
      return false;
    }

    const nuevaInicio = new Date(funcion.fecha_hora).getTime();
    const duracionMs = pelicula.duracion_minutos * 60000;
    const margenMs = 30 * 60000; // 30 minutos 
    const nuevaFin = nuevaInicio + duracionMs + margenMs;

    const { data: funcionesSala, error: funError } = await this.supabase
      .from('funciones')
      .select('*, peliculas(duracion_minutos)')
      .eq('sala', funcion.sala);

    if (funError) {
      console.error('Error al verificar salas:', funError.message);
      return false;
    }

    // 3. Validar solapamiento de horarios
    if (funcionesSala) {
      for (const f of funcionesSala) {
        const fInicio = new Date(f.fecha_hora).getTime();
        const fDuracion = f.peliculas?.duracion_minutos || 120;
        const fFin = fInicio + (fDuracion + 30) * 60000;

        if (nuevaInicio < fFin && nuevaFin > fInicio) {
          alert('Conflicto de horario: Debe haber al menos 30 minutos libres respecto a otra función en la misma sala[cite: 3].');
          return false;
        }
      }
    }

    // 4. Insertar la función si pasa la validación
    const { error: insertError } = await this.supabase
      .from('funciones')
      .insert([funcion]);

    if (insertError) {
      console.error('Error al programar función:', insertError.message);
      alert('Error al programar la función.');
      return false;
    }

    alert('¡Función programada correctamente!');
    return true;
  }
}