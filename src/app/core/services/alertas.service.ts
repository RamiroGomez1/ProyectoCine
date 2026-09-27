import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Injectable({
  providedIn: 'root'
})
export class AlertasService {
  private supabase = inject(SupabaseService).client;

  async activarAlerta(usuarioId: string, peliculaId: string): Promise<void> {

    const { error } = await this.supabase
      .from('alertas_estrenos')
      .insert({
        usuario_id: usuarioId,
        pelicula_id: peliculaId,
        activa: true
      });

    if (error) {
      console.error('Error al activar la alerta:', error.message);
      throw error;
    }
  }
}