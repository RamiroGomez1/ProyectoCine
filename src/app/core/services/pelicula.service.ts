import { Injectable, inject, signal } from '@angular/core';
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
        duracion_minutos: nuevaPelicula.duracionMinutos,
        portada_url: portadaUrl,
        generos: nuevaPelicula.generos,
        formato: nuevaPelicula.formato,
        idioma: nuevaPelicula.idioma,
        clasificacion_edad: nuevaPelicula.clasificacionEdad,
        precio_base: nuevaPelicula.precioBase,
        es_preventa: nuevaPelicula.esPreventa ?? false
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

  // cuenta las entradas de las compras pagadas de cada pelicula y devuelve las 3 con mas ventas
  async obtenerTop3Vendidas() {
    const { data: ventas, error } = await this.supabase
      .from('reservas')
      .select('asientos, funciones(pelicula_id)')
      .in('estado', ['confirmada', 'usada']);

    if (error) {
      console.error('Error al obtener top 3:', error.message);
      return [];
    }

    const conteo: { [id: string]: number } = {};
    (ventas || []).forEach((v: any) => {
      const id = v.funciones?.pelicula_id;
      if (!id) return;
      conteo[id] = (conteo[id] || 0) + (Array.isArray(v.asientos) ? v.asientos.length : 0);
    });

    const ids = Object.keys(conteo).sort((a, b) => conteo[b] - conteo[a]).slice(0, 3);
    if (ids.length === 0) return [];

    const { data: peliculas } = await this.supabase
      .from('peliculas')
      .select('*')
      .in('id', ids)
      .eq('visible', true);

    return (peliculas || [])
      .map(p => ({ ...p, entradas_vendidas: conteo[p.id] }))
      .sort((a, b) => b.entradas_vendidas - a.entradas_vendidas);
  }

  async actualizarPelicula(id: string, cambios: any): Promise<{ exito: boolean; mensaje?: string }> {
    const { error } = await this.supabase
      .from('peliculas')
      .update(cambios)
      .eq('id', id);

    if (error) return { exito: false, mensaje: error.message };
    return { exito: true };
  }

  // La venta abre el dia del estreno, o 7 dias antes si la pelicula tiene preventa

  fechaAperturaVenta(peli: any): Date | null {
    if (!peli?.fecha_estreno) return null;
    const apertura = new Date(peli.fecha_estreno + 'T00:00:00');
    if (peli.es_preventa) {
      apertura.setDate(apertura.getDate() - 7);
    }
    return apertura;
  }

  ventaAbierta(peli: any): boolean {
    const apertura = this.fechaAperturaVenta(peli);
    if (!apertura) return true;
    return new Date() >= apertura;
  }

  enPreventa(peli: any): boolean {
    if (!peli?.es_preventa || !peli?.fecha_estreno) return false;
    const estreno = new Date(peli.fecha_estreno + 'T00:00:00');
    return this.ventaAbierta(peli) && new Date() < estreno;
  }

  precioEntrada(peli: any, precioFuncion: number): number {
    if (this.enPreventa(peli) && Number(peli.precio_preventa) > 0) {
      return Number(peli.precio_preventa);
    }
    return Number(precioFuncion);
  }
}
