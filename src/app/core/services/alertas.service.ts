import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { PeliculasService } from './pelicula.service';

@Injectable({
  providedIn: 'root'
})
export class AlertasService {
  private supabase = inject(SupabaseService).client;
  private peliculaService = inject(PeliculasService);

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

    // pedimos permiso para mandar la notificacion del navegador
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  async obtenerAlertas(usuarioId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from('alertas_estrenos')
      .select('pelicula_id')
      .eq('usuario_id', usuarioId)
      .eq('activa', true);

    return (data || []).map(a => a.pelicula_id);
  }

  // Se fija si alguna pelicula con alerta ya tiene la venta abierta.
  // Si es asi avisa y desactiva la alerta para no avisar de nuevo
  async revisarAlertas(usuarioId: string): Promise<string[]> {
    const { data } = await this.supabase
      .from('alertas_estrenos')
      .select('id, peliculas(*)')
      .eq('usuario_id', usuarioId)
      .eq('activa', true);

    const avisos: string[] = [];

    for (const alerta of (data || []) as any[]) {
      const peli = alerta.peliculas;
      if (!peli || !this.peliculaService.ventaAbierta(peli)) continue;

      const mensaje = `¡Ya están a la venta las entradas de ${peli.titulo}!`;
      avisos.push(mensaje);

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Proyecto Cine', { body: mensaje });
      }

      await this.supabase
        .from('alertas_estrenos')
        .update({ activa: false })
        .eq('id', alerta.id);
    }

    return avisos;
  }
}
