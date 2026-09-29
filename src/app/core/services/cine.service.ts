import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class CineService {
  private supabase = inject(SupabaseService).client;

  async agregarFuncion(funcion: {
    pelicula_id: string;
    sala: string;
    fecha_hora: string;
    precio: number;
    formato: string;
    idioma: string;
  }): Promise<{ exito: boolean; mensaje?: string }> {
    try {
      const { data: pelicula, error: pelError } = await this.supabase
        .from('peliculas')
        .select('duracion_minutos')
        .eq('id', funcion.pelicula_id)
        .single();

      if (pelError || !pelicula) {
        return { exito: false, mensaje: 'No se pudo obtener la duración de la película.' };
      }

      const nuevaInicio = new Date(funcion.fecha_hora).getTime();
      const duracionMs = (pelicula.duracion_minutos || 120) * 60000;
      const margenMs = 30 * 60000; 
      const nuevaFin = nuevaInicio + duracionMs + margenMs;

      const { data: funcionesSala, error: funError } = await this.supabase
        .from('funciones')
        .select('id, fecha_hora, pelicula_id')
        .eq('sala', funcion.sala);

      if (funError) {
        return { exito: false, mensaje: `Error consultando la sala: ${funError.message}` };
      }

      if (funcionesSala && funcionesSala.length > 0) {
        for (const f of funcionesSala) {
          const { data: peliExistente } = await this.supabase
            .from('peliculas')
            .select('duracion_minutos')
            .eq('id', f.pelicula_id)
            .single();

          const fInicio = new Date(f.fecha_hora).getTime();
          const fDuracionMs = ((peliExistente?.duracion_minutos || 120) + 30) * 60000;
          const fFin = fInicio + fDuracionMs;

          if (nuevaInicio < fFin && nuevaFin > fInicio) {
            return {
              exito: false,
              mensaje: 'Conflicto de horario: Debe haber al menos 30 minutos libres respecto a otra función en la misma sala.'
            };
          }
        }
      }

      const { error: insertError } = await this.supabase
        .from('funciones')
        .insert([
          {
            pelicula_id: funcion.pelicula_id,
            sala: funcion.sala,
            fecha_hora: funcion.fecha_hora,
            precio: funcion.precio,
            formato: funcion.formato,
            idioma: funcion.idioma
          }
        ]);

      if (insertError) {
        return { exito: false, mensaje: insertError.message };
      }

      return { exito: true };
    } catch (err: any) {
      return { exito: false, mensaje: err.message || 'Error inesperado al programar función.' };
    }
  }
}