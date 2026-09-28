import { Component, inject, signal } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuditoriaService } from '../../core/services/auditoria.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  templateUrl: './qr-scan.html',
  styleUrl: './qr-scan.css'
})
export class QrScannerComponent {
  private supabase = inject(SupabaseService).client;
  private auditoria = inject(AuditoriaService);
  private authService = inject(AuthService);

  codigoManual = signal('');
  mensajeValidacion = signal<{ texto: string, tipo: 'exito' | 'error' } | null>(null);

  async procesarCodigo(codigoQR: string) {
    if (!codigoQR.trim()) {
      this.mensajeValidacion.set({ texto: 'Ingresá un código válido.', tipo: 'error' });
      return;
    }

    const { data: reserva, error: fetchError } = await this.supabase
      .from('reservas')
      .select('*')
      .eq('qr_codigo', codigoQR)
      .single();

    if (fetchError || !reserva) {
      this.mensajeValidacion.set({ texto: 'Código QR inválido o no encontrado en el sistema.', tipo: 'error' });
      return;
    }

    if (reserva.estado === 'usada' || reserva.estado === 'utilizado') {
      this.mensajeValidacion.set({ texto: 'Este código ya fue validado previamente.', tipo: 'error' });
      return;
    }

    const { error: updateError } = await this.supabase
      .from('reservas')
      .update({ estado: 'usada' })
      .eq('id', reserva.id);

    if (updateError) {
      this.mensajeValidacion.set({ texto: 'Error al actualizar el estado de la entrada.', tipo: 'error' });
      return;
    }

    this.mensajeValidacion.set({ texto: 'Entrada validada correctamente. ¡Disfrute la función!', tipo: 'exito' });

    const empleado = this.authService.currentUser();
    if (empleado) {
      await this.auditoria.registrarAccion(empleado.id, 'Validación QR', `QR validado correctamente para la reserva ID: ${reserva.id}`);
    }
  }
}