import { Component, ElementRef, inject, OnDestroy, signal, viewChild } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuditoriaService } from '../../core/services/auditoria.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  templateUrl: './qr-scan.html',
  styleUrl: './qr-scan.css'
})
export class QrScannerComponent implements OnDestroy {
  private supabase = inject(SupabaseService).client;
  private auditoria = inject(AuditoriaService);
  private authService = inject(AuthService);

  // el mismo QR sirve para la sala y para el candy, pero se valida por separado
  modo = signal<'entrada' | 'candy'>('entrada');
  codigoManual = signal('');
  mensajeValidacion = signal<{ texto: string, tipo: 'exito' | 'error' } | null>(null);
  reservaValidada = signal<any>(null);

  // camara del celular para leer el QR
  video = viewChild<ElementRef<HTMLVideoElement>>('video');
  camaraActiva = signal(false);
  private stream: MediaStream | null = null;
  private intervalo: any = null;

  async iniciarCamara() {
    // BarcodeDetector lo trae el navegador (Chrome en Android), no hace falta otra libreria
    if (!('BarcodeDetector' in window)) {
      this.mensajeValidacion.set({ texto: 'Este navegador no puede leer QR con la cámara. Usá Chrome en el celular o ingresá el código a mano.', tipo: 'error' });
      return;
    }

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    } catch (err) {
      this.mensajeValidacion.set({ texto: 'No se pudo acceder a la cámara.', tipo: 'error' });
      return;
    }

    this.mensajeValidacion.set(null);
    this.camaraActiva.set(true);

    // esperamos a que se dibuje el <video>
    setTimeout(() => {
      const video = this.video()!.nativeElement;
      video.srcObject = this.stream;
      video.play();

      const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      this.intervalo = setInterval(async () => {
        const codigos = await detector.detect(video).catch(() => []);
        if (codigos.length > 0) {
          this.detenerCamara();
          this.procesarCodigo(codigos[0].rawValue);
        }
      }, 500);
    });
  }

  detenerCamara() {
    clearInterval(this.intervalo);
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.camaraActiva.set(false);
  }

  ngOnDestroy() {
    this.detenerCamara();
  }

  cambiarModo(modo: 'entrada' | 'candy') {
    this.modo.set(modo);
    this.mensajeValidacion.set(null);
    this.reservaValidada.set(null);
  }

  async procesarCodigo(codigoQR: string) {
    this.reservaValidada.set(null);

    if (!codigoQR.trim()) {
      this.mensajeValidacion.set({ texto: 'Ingresá un código válido.', tipo: 'error' });
      return;
    }

    const { data: reserva, error: fetchError } = await this.supabase
      .from('reservas')
      .select('*, funciones(sala, fecha_hora, peliculas(titulo))')
      .eq('qr_codigo', codigoQR.trim())
      .single();

    if (fetchError || !reserva) {
      this.mensajeValidacion.set({ texto: 'Código QR inválido o no encontrado en el sistema.', tipo: 'error' });
      return;
    }

    if (reserva.estado === 'cancelada' || reserva.estado === 'bloqueada') {
      this.mensajeValidacion.set({ texto: 'Esta compra no es válida (fue cancelada).', tipo: 'error' });
      return;
    }

    if (this.modo() === 'entrada') {
      await this.validarEntrada(reserva);
    } else {
      await this.validarCandy(reserva);
    }

    this.codigoManual.set('');
  }

  async validarEntrada(reserva: any) {
    if (reserva.estado === 'usada') {
      this.mensajeValidacion.set({ texto: 'Esta entrada ya fue validada previamente.', tipo: 'error' });
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
    this.reservaValidada.set(reserva);
    await this.registrarLog('Validación QR entrada', `Entrada validada de la reserva ID: ${reserva.id}`);
  }

  async validarCandy(reserva: any) {
    if (!reserva.items_candy || reserva.items_candy.length === 0) {
      this.mensajeValidacion.set({ texto: 'Esta compra no tiene productos del Candy Bar.', tipo: 'error' });
      return;
    }

    if (reserva.candy_entregado) {
      this.mensajeValidacion.set({ texto: 'Los productos de esta compra ya fueron entregados.', tipo: 'error' });
      return;
    }

    const { error: updateError } = await this.supabase
      .from('reservas')
      .update({ candy_entregado: true })
      .eq('id', reserva.id);

    if (updateError) {
      this.mensajeValidacion.set({ texto: 'Error al marcar la entrega.', tipo: 'error' });
      return;
    }

    this.mensajeValidacion.set({ texto: 'Código válido. Entregá los siguientes productos:', tipo: 'exito' });
    this.reservaValidada.set(reserva);
    await this.registrarLog('Validación QR candy', `Candy entregado de la reserva ID: ${reserva.id}`);
  }

  async registrarLog(tipo: string, detalle: string) {
    const empleado = this.authService.currentUser();
    if (empleado) {
      await this.auditoria.registrarAccion(empleado.id, tipo, detalle);
    }
  }
}
