import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class FidelizacionService {
  private supabase = inject(SupabaseService).client;

  async sumarPuntos(userId: string, montoGastado: number): Promise<void> {
    const puntosGanados = Math.floor(montoGastado); // 1 punto por peso[cite: 2]
    
    const { data: perfil } = await this.supabase
      .from('profiles') 
      .select('puntos')
      .eq('id', userId)
      .single();

    const nuevosPuntos = (perfil?.puntos || 0) + puntosGanados;

    // Actualiza el balance
    await this.supabase
      .from('profiles')
      .update({ puntos: nuevosPuntos })
      .eq('id', userId);
  }

  // Cancela la compra y otorga credito
  async cancelarReservaYOtrogarCredito(reservaId: number, userId: string): Promise<boolean> {
    const { data: reserva } = await this.supabase
      .from('reservas')
      .select('hora_funcion, monto_total')
      .eq('id', reservaId)
      .single();

    if (!reserva) return false;

    const ahora = new Date();
    const horaFuncion = new Date(reserva.hora_funcion);
    const diferenciaHoras = (horaFuncion.getTime() - ahora.getTime()) / (1000 * 60 * 60);

    if (diferenciaHoras < 2) {
      throw new Error("Solo se puede cancelar hasta 2 horas antes de la función.");
    }

    // damos el credito
    const { data: perfil } = await this.supabase
      .from('profiles')
      .select('credito_favor')
      .eq('id', userId)
      .single();

    const nuevoCredito = (perfil?.credito_favor || 0) + reserva.monto_total;

    await this.supabase.from('profiles').update({ credito_favor: nuevoCredito }).eq('id', userId);
    
    // Cambiamos el estado de la reserva
    await this.supabase.from('reservas').update({ estado: 'cancelada' }).eq('id', reservaId);

    return true;
  }
}