import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';
import { CuponesService } from '../../core/services/cupones.service';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { PdfService } from '../../core/services/pdf.service';
import { FidelizacionService } from '../../core/services/fidelizacion.service';
import * as QRCode from 'qrcode';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './resumen.html',
  styleUrl: './resumen.css'
})
export class ResumenComponent implements OnInit {
  carritoService = inject(CarritoService);
  private cuponesService = inject(CuponesService);
  public authService = inject(AuthService);
  private supabase = inject(SupabaseService).client;
  private pdfService = inject(PdfService);
  private fidelizacionService = inject(FidelizacionService);
  private router = inject(Router);

  reservaData = signal<any>(null);
  codigoCupon = signal('');
  descuentoAplicado = signal(0);
  mensajeCupon = signal('');

  usarSaldoFavor = signal(false);
  usarPuntos = signal(false);

  readonly VALOR_PUNTO = 0.1;

  puedeComprar = signal(true);
  mensajeRestriccion = signal('');

  qrGenerado = signal<string | null>(null);
  qrCodigoRaw = signal<string>('');
  cargandoPago = signal(false);

  saldoDisponible = computed(() => {
    return Number(this.authService.currentUserData()?.saldoFavor || 0);
  });

  puntosDisponibles = computed(() => {
    return Number(this.authService.currentUserData()?.puntosFidelidad || 0);
  });

  descuentoSaldo = computed(() => {
    if (!this.usarSaldoFavor()) return 0;
    const subtotalTrasCupon = Math.max(0, this.carritoService.total() - this.descuentoAplicado());
    return Math.min(this.saldoDisponible(), subtotalTrasCupon);
  });

  descuentoPuntos = computed(() => {
    if (!this.usarPuntos()) return 0;
    const maxDescuento = this.puntosDisponibles() * this.VALOR_PUNTO;
    const subtotalPendiente = Math.max(0, this.carritoService.total() - this.descuentoAplicado() - this.descuentoSaldo());
    return Math.min(maxDescuento, subtotalPendiente);
  });

  totalPagar = computed(() => {
    const subtotal = this.carritoService.total() - this.descuentoAplicado();
    const subtotalConSaldo = Math.max(0, subtotal - this.descuentoSaldo());
    return Math.max(0, subtotalConSaldo - this.descuentoPuntos());
  });

  ngOnInit() {
    const raw = sessionStorage.getItem('reserva_activa');
    if (!raw && this.carritoService.items().length === 0) {
      this.router.navigate(['/home']);
      return;
    }

    if (raw) {
      const data = JSON.parse(raw);
      this.reservaData.set(data);
      this.validarEdad(data.pelicula);
    }
  }

  validarEdad(pelicula: any) {
    if (!pelicula || !pelicula.clasificacion_edad || pelicula.clasificacion_edad < 13) return;

    const user = this.authService.currentUserData();
    const restriccion = pelicula.clasificacion_edad;

    if (!user) {
      this.puedeComprar.set(false);
      this.mensajeRestriccion.set(`Película +${restriccion}. Iniciá sesión para verificar tu edad.`);
      return;
    }

    if (!user.fechaNacimiento) {
      this.puedeComprar.set(false);
      this.mensajeRestriccion.set('Tu cuenta no tiene fecha de nacimiento registrada.');
      return;
    }

    const edad = this.cuponesService.calcularEdad(user.fechaNacimiento);
    if (edad < restriccion) {
      this.puedeComprar.set(false);
      this.mensajeRestriccion.set(`Compra bloqueada: Tenés ${edad} años y la película requiere ser mayor de ${restriccion} años.`);
    }
  }

  aplicarCupon() {
    const total = this.carritoService.total();
    const res = this.cuponesService.validarCupon(this.codigoCupon(), total);
    this.mensajeCupon.set(res.mensaje);
    this.descuentoAplicado.set(res.valido ? res.descuento : 0);
  }

  async confirmarCompra() {
    if (!this.puedeComprar() || this.cargandoPago()) return;

    this.cargandoPago.set(true);
    const user = this.authService.currentUser();
    const data = this.reservaData();
    const total = this.totalPagar();
    const descuentoSaldoUsado = this.descuentoSaldo();
    const puntosCanjeados = Math.ceil(this.descuentoPuntos() / this.VALOR_PUNTO);

    const itemsCandy = this.carritoService.items()
      .filter(i => i.tipo === 'candy')
      .map(i => ({ nombre: i.nombre, cantidad: i.cantidad }));

    const qrCodigo = `TICKET-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    this.qrCodigoRaw.set(qrCodigo);

    try {
      if (data?.asientos && data.asientos.length > 0) {
        await this.supabase
          .from('reservas')
          .delete()
          .eq('funcion_id', data.funcion_id)
          .eq('estado', 'bloqueada')
          .in('asientos', data.asientos);
      }

      const { error: resError } = await this.supabase
        .from('reservas')
        .insert([
          {
            funcion_id: data.funcion_id,
            usuario_id: user?.id || null,
            asientos: data.asientos,
            total_pagar: total,
            qr_codigo: qrCodigo,
            estado: 'confirmada',
            fecha_compra: new Date().toISOString()
          }
        ]);

      if (resError) throw resError;

      if (user && puntosCanjeados > 0) {
        await this.fidelizacionService.descontarPuntos(user.id, puntosCanjeados);
      }

      if (user && descuentoSaldoUsado > 0) {
        const nuevoSaldo = Math.max(0, this.saldoDisponible() - descuentoSaldoUsado);
        await this.supabase
          .from('usuarios')
          .update({ saldo_favor: nuevoSaldo })
          .eq('id', user.id);
      }

      if (user && total > 0) {
        await this.fidelizacionService.sumarPuntos(user.id, total);
        await this.authService.cargarDatosUsuario(user.id);
      }

      const { data: peliActual } = await this.supabase
        .from('peliculas')
        .select('entradas_vendidas')
        .eq('id', data.pelicula.id)
        .single();

      const totalVendidas = (peliActual?.entradas_vendidas || 0) + (data.asientos?.length || 1);
      await this.supabase
        .from('peliculas')
        .update({ entradas_vendidas: totalVendidas })
        .eq('id', data.pelicula.id);

      const urlQR = await QRCode.toDataURL(qrCodigo, { width: 250, margin: 1 });
      this.qrGenerado.set(urlQR);

      await this.pdfService.generarTicketPDF({
        tituloPelicula: data?.pelicula?.titulo || 'Película',
        sala: data?.sala || 'Sala General',
        fechaHora: data?.fecha_hora || new Date().toLocaleString(),
        asientos: data?.asientos || [],
        total: total,
        qrCodigo: qrCodigo,
        itemsCandy: itemsCandy
      });

      this.carritoService.limpiarCarrito();

    } catch (err: any) {
      console.error('Error al procesar compra o descargar PDF:', err);
      alert(`Error: ${err.message || 'No se pudo completar la compra'}`);
    } finally {
      this.cargandoPago.set(false);
    }
  }

  descargarTicketPDF() {
    const data = this.reservaData();
    const itemsCandy = this.carritoService.items()
      .filter(i => i.tipo === 'candy')
      .map(i => ({ nombre: i.nombre, cantidad: i.cantidad }));

    this.pdfService.generarTicketPDF({
      tituloPelicula: data?.pelicula?.titulo || 'Película',
      sala: data?.sala || 'Sala General',
      fechaHora: data?.fecha_hora || new Date().toLocaleString(),
      asientos: data?.asientos || [],
      total: this.totalPagar(),
      qrCodigo: this.qrCodigoRaw(),
      itemsCandy: itemsCandy
    });
  }
}