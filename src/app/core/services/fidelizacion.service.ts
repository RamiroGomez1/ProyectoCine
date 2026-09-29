import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({ providedIn: 'root' })
export class FidelizacionService {
  private supabase = inject(SupabaseService).client;

  async sumarPuntos(userId: string, montoGastado: number): Promise<void> {
    const puntosGanados = Math.floor(montoGastado);
    if (puntosGanados <= 0) return;

    const { data: usuario, error: fetchError } = await this.supabase
      .from('usuarios')
      .select('puntos_fidelidad')
      .eq('id', userId)
      .single();

    if (fetchError) {
      console.error('Error al obtener puntos del usuario:', fetchError.message);
      return;
    }

    const nuevosPuntos = (usuario?.puntos_fidelidad || 0) + puntosGanados;

    const { error: updateError } = await this.supabase
      .from('usuarios')
      .update({ puntos_fidelidad: nuevosPuntos })
      .eq('id', userId);

    if (updateError) {
      console.error('Error al actualizar puntos de fidelidad:', updateError.message);
    }
  }

  async cancelarReservaYOtrogarCredito(reservaId: string, userId: string): Promise<boolean> {
    const { data: reserva, error: reservaError } = await this.supabase
      .from('reservas')
      .select('id, total_pagar, estado, funciones(fecha_hora)')
      .eq('id', reservaId)
      .single();

    if (reservaError || !reserva) {
      throw new Error('No se encontró la reserva indicada.');
    }

    if (reserva.estado === 'cancelada') {
      throw new Error('Esta reserva ya se encuentra cancelada.');
    }

    const fechaHoraFuncion = (reserva as any).funciones?.fecha_hora;
    if (!fechaHoraFuncion) {
      throw new Error('No se pudo verificar el horario de la función.');
    }

    const ahora = new Date().getTime();
    const horaFuncion = new Date(fechaHoraFuncion).getTime();
    const diferenciaHoras = (horaFuncion - ahora) / (1000 * 60 * 60);

    if (diferenciaHoras < 2) {
      throw new Error('Solo se puede cancelar con al menos 2 horas de anticipación a la función.');
    }

    const { data: usuario, error: userError } = await this.supabase
      .from('usuarios')
      .select('saldo_favor')
      .eq('id', userId)
      .single();

    if (userError) {
      throw new Error('Error al consultar el saldo del usuario.');
    }

    const nuevoSaldo = Number(usuario?.saldo_favor || 0) + Number(reserva.total_pagar || 0);

    const { error: updateSaldoError } = await this.supabase
      .from('usuarios')
      .update({ saldo_favor: nuevoSaldo })
      .eq('id', userId);

    if (updateSaldoError) {
      throw new Error('Error al acreditar saldo a favor.');
    }

    const { error: cancelError } = await this.supabase
      .from('reservas')
      .update({ estado: 'cancelada' })
      .eq('id', reservaId);

    if (cancelError) {
      throw new Error('Error al actualizar el estado de la reserva.');
    }

    return true;
  }
}