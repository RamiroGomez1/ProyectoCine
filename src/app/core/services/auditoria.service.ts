import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AuditoriaService {
  private supabase = inject(SupabaseService).client;

  async registrarAccion(usuarioId: string, tipoAccion: string, detalle: string): Promise<void> {
    const { error } = await this.supabase
      .from('logs_auditoria')
      .insert({
        usuario_id: usuarioId,
        tipo_accion: tipoAccion,
        detalle: detalle,
        fecha_hora: new Date().toISOString()
      });

    if (error) {
      console.error('Error al registrar log de auditoría:', error.message);
    }
  }
}