import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service'; // Ajusta la ruta a tu servicio de supabase[cite: 4]

@Injectable({ providedIn: 'root' })
export class FuncionService {
  private supabase = inject(SupabaseService).client;

  async validarDisponibilidadSala(salaId: string, horaInicioNueva: Date, duracionMinutos: number): Promise<boolean> {
    const horaFinNueva = new Date(horaInicioNueva.getTime() + duracionMinutos * 60000);
    // Agregamos los 30 minutos de margen de limpieza
    const horaFinConMargen = new Date(horaFinNueva.getTime() + 30 * 60000);

    const { data: funciones, error } = await this.supabase
      .from('funciones')
      .select('hora_inicio, duracion_minutos')
      .eq('sala_id', salaId)
      .gte('hora_inicio', new Date(horaInicioNueva.setHours(0, 0, 0, 0)).toISOString())
      .lte('hora_inicio', new Date(horaInicioNueva.setHours(23, 59, 59, 999)).toISOString());

    if (error) {
      console.error('Error al validar horarios:', error);
      throw error;
    }

    // Comprobamos solapamientos
    for (const f of funciones) {
      const inicioExistente = new Date(f.hora_inicio);
      const finExistente = new Date(inicioExistente.getTime() + f.duracion_minutos * 60000);
      const finExistenteConMargen = new Date(finExistente.getTime() + 30 * 60000);


      if (horaInicioNueva < finExistenteConMargen && horaFinConMargen > inicioExistente) {
        // se solapan
        return false;
      }
    }
    return true;
  }
}