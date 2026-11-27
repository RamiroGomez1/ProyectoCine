import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

const MARGEN_MINUTOS = 30;

@Injectable({
  providedIn: 'root'
})
export class CineService {
  private supabase = inject(SupabaseService).client;

  async obtenerSalas(): Promise<{ id: string; nombre: string }[]> {
    const { data, error } = await this.supabase
      .from('salas')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      console.error('Error al obtener salas:', error.message);
      return [];
    }
    return data || [];
  }

  async agregarSala(nombre: string): Promise<{ exito: boolean; mensaje?: string }> {
    const { error } = await this.supabase.from('salas').insert({ nombre: nombre.trim() });
    if (error) return { exito: false, mensaje: error.message };
    return { exito: true };
  }

  async eliminarSala(id: string): Promise<{ exito: boolean; mensaje?: string }> {
    const { error } = await this.supabase.from('salas').delete().eq('id', id);
    if (error) return { exito: false, mensaje: error.message };
    return { exito: true };
  }

  // Recibe todas las fechas/horas que eligio el admin y a cada una le busca
  // la primer sala libre (respetando los 30 min despues de la funcion anterior)
  async programarFunciones(datos: {
    pelicula_id: string;
    fechas: string[];
    precio: number;
    formato: string;
    idioma: string;
  }): Promise<{ exito: boolean; mensaje?: string; creadas: { fecha: string; sala: string }[]; sinSala: string[] }> {
    const resultado = { exito: false, mensaje: '', creadas: [] as { fecha: string; sala: string }[], sinSala: [] as string[] };

    try {
      const { data: pelicula, error: pelError } = await this.supabase
        .from('peliculas')
        .select('duracion_minutos')
        .eq('id', datos.pelicula_id)
        .single();

      if (pelError || !pelicula) {
        resultado.mensaje = 'No se pudo obtener la duración de la película.';
        return resultado;
      }

      const salas = await this.obtenerSalas();
      if (salas.length === 0) {
        resultado.mensaje = 'No hay salas cargadas.';
        return resultado;
      }

      const { data: existentes, error: funError } = await this.supabase
        .from('funciones')
        .select('sala, fecha_hora, peliculas(duracion_minutos)');

      if (funError) {
        resultado.mensaje = `Error consultando las funciones: ${funError.message}`;
        return resultado;
      }

      // lista de horarios ocupados por sala (inicio y fin en ms)
      const ocupados = (existentes || []).map((f: any) => {
        const inicio = new Date(f.fecha_hora).getTime();
        const duracion = f.peliculas?.duracion_minutos || 120;
        return { sala: f.sala, inicio, fin: inicio + duracion * 60000 };
      });

      const duracionNueva = (pelicula.duracion_minutos || 120) * 60000;
      const margen = MARGEN_MINUTOS * 60000;
      const nuevas: any[] = [];

      for (const fecha of datos.fechas) {
        const inicio = new Date(fecha).getTime();
        const fin = inicio + duracionNueva;

        const salaLibre = salas.find(s =>
          !ocupados.some(o => o.sala === s.nombre && inicio < o.fin + margen && o.inicio < fin + margen)
        );

        if (!salaLibre) {
          resultado.sinSala.push(fecha);
          continue;
        }

        ocupados.push({ sala: salaLibre.nombre, inicio, fin });
        resultado.creadas.push({ fecha, sala: salaLibre.nombre });
        nuevas.push({
          pelicula_id: datos.pelicula_id,
          sala: salaLibre.nombre,
          fecha_hora: fecha,
          precio: datos.precio,
          formato: datos.formato,
          idioma: datos.idioma
        });
      }

      if (nuevas.length > 0) {
        const { error: insertError } = await this.supabase.from('funciones').insert(nuevas);
        if (insertError) {
          resultado.mensaje = insertError.message;
          resultado.creadas = [];
          return resultado;
        }
      }

      resultado.exito = true;
      return resultado;
    } catch (err: any) {
      resultado.mensaje = err.message || 'Error inesperado al programar función.';
      return resultado;
    }
  }

  // funciones que todavia no pasaron, para mostrarlas en el admin
  async obtenerFuncionesProgramadas() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const { data, error } = await this.supabase
      .from('funciones')
      .select('*, peliculas(titulo)')
      .gte('fecha_hora', hoy.toISOString())
      .order('fecha_hora', { ascending: true });

    if (error) {
      console.error('Error al obtener funciones:', error.message);
      return [];
    }
    return data || [];
  }

  async eliminarFuncion(id: string): Promise<{ exito: boolean; mensaje?: string }> {
    const { count } = await this.supabase
      .from('reservas')
      .select('id', { count: 'exact', head: true })
      .eq('funcion_id', id)
      .in('estado', ['confirmada', 'usada']);

    if ((count || 0) > 0) {
      return { exito: false, mensaje: 'No se puede borrar una función que ya tiene entradas vendidas.' };
    }

    const { error } = await this.supabase.from('funciones').delete().eq('id', id);
    if (error) return { exito: false, mensaje: error.message };
    return { exito: true };
  }
}
