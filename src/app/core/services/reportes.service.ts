import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private supabase = inject(SupabaseService).client;

  async obtenerLogsActividad() {
    const { data, error } = await this.supabase
      .from('logs_auditoria')
      .select('*, perfiles(nombre, apellido)')
      .order('fecha_hora', { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  }

  async obtenerPeliculasMasVistas() {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select('nombre, entradas_vendidas')
      .order('entradas_vendidas', { ascending: false })
      .limit(5);
    if (error) throw error;
    return data;
  }

  async obtenerProductoMasVendidoCandy() {
    const { data, error } = await this.supabase
      .from('productos_candy')
      .select('nombre, cantidad_vendida')
      .order('cantidad_vendida', { ascending: false })
      .limit(1)
      .single();
    if (error) throw error;
    return data;
  }

  exportarFacturacion(formato: 'pdf' | 'excel') {
    console.log(`Generando reporte de facturación en formato ${formato.toUpperCase()}...`);
    // procesar los datos de la tabla 'reservas' y se genera el archivo
  }
}