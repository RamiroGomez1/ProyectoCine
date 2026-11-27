import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CarritoService, ItemCarrito } from '../../core/services/carrito.service';
import { CuponesService } from '../../core/services/cupones.service';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { PdfService } from '../../core/services/pdf.service';
import { FidelizacionService } from '../../core/services/fidelizacion.service';
import * as QRCode from 'qrcode';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './resumen.html',
  styleUrl: './resumen.css'
})
export class ResumenComponent implements OnInit {
  carritoService = inject(CarritoService);
  private modal = inject(ModalService);
  private cuponesService = inject(CuponesService);
  public authService = inject(AuthService);
  private supabase = inject(SupabaseService).client;
  private pdfService = inject(PdfService);
  private fidelizacionService = inject(FidelizacionService);
  private router = inject(Router);

  reservaData = signal<any>(null);
  codigoCupon = signal('');
  porcentajeCupon = signal(0);
  mensajeCupon = signal('');

  usarSaldoFavor = signal(false);

  // items que el usuario eligio pagar con puntos
  canjeados = signal<string[]>([]);

  metodosPago = ['Tarjeta de crédito', 'Tarjeta de débito', 'Mercado Pago'];
  metodoPago = signal('Tarjeta de crédito');

  puedeComprar = signal(true);
  mensajeRestriccion = signal('');

  qrGenerado = signal<string | null>(null);
  qrCodigoRaw = signal<string>('');
  cargandoPago = signal(false);
  datosTicket: any = null;

  saldoDisponible = computed(() => {
    return Number(this.authService.currentUserData()?.saldoFavor || 0);
  });

  puntosDisponibles = computed(() => {
    return Number(this.authService.currentUserData()?.puntosFidelidad || 0);
  });

  // cada combo incluye una entrada, asi que esas entradas no se cobran
  entradasEnCombo = computed(() => {
    const items = this.carritoService.items();
    const combos = items
      .filter(i => i.tipo === 'candy' && i.esCombo)
      .reduce((acc, i) => acc + i.cantidad, 0);

    return items
      .filter(i => i.tipo === 'entrada')
      .slice(0, combos)
      .map(i => String(i.id));
  });

  puntosUsados = computed(() => {
    return this.carritoService.items()
      .filter(i => this.estaCanjeado(i))
      .reduce((acc, i) => acc + this.puntosItem(i), 0);
  });

  subtotal = computed(() => {
    return this.carritoService.items().reduce((acc, i) => acc + this.precioItem(i), 0);
  });

  descuentoAplicado = computed(() => {
    return Math.round(this.subtotal() * this.porcentajeCupon() / 100);
  });

  descuentoSaldo = computed(() => {
    if (!this.usarSaldoFavor()) return 0;
    const subtotalTrasCupon = Math.max(0, this.subtotal() - this.descuentoAplicado());
    return Math.min(this.saldoDisponible(), subtotalTrasCupon);
  });

  totalPagar = computed(() => {
    return Math.max(0, this.subtotal() - this.descuentoAplicado() - this.descuentoSaldo());
  });

  tieneVip = computed(() => {
    return this.carritoService.items().some(i => i.tipo === 'entrada' && i.nombre.includes('(VIP)'));
  });

  async ngOnInit() {
    await this.authService.esperarSesion();
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

  claveItem(item: ItemCarrito): string {
    return `${item.tipo}-${item.id}`;
  }

  incluidaEnCombo(item: ItemCarrito): boolean {
    return item.tipo === 'entrada' && this.entradasEnCombo().includes(String(item.id));
  }

  estaCanjeado(item: ItemCarrito): boolean {
    return this.canjeados().includes(this.claveItem(item));
  }

  puntosItem(item: ItemCarrito): number {
    return (item.costoPuntos || 0) * item.cantidad;
  }

  precioItem(item: ItemCarrito): number {
    if (this.incluidaEnCombo(item) || this.estaCanjeado(item)) return 0;
    return item.precio * item.cantidad;
  }

  puedeCanjear(item: ItemCarrito): boolean {
    if (!this.authService.currentUser() || !item.costoPuntos || this.incluidaEnCombo(item)) return false;
    if (this.estaCanjeado(item)) return true;
    return this.puntosUsados() + this.puntosItem(item) <= this.puntosDisponibles();
  }

  alternarCanje(item: ItemCarrito) {
    const clave = this.claveItem(item);
    this.canjeados.update(lista =>
      lista.includes(clave) ? lista.filter(c => c !== clave) : [...lista, clave]
    );
  }

  async aplicarCupon() {
    const res = await this.cuponesService.validarCupon(this.codigoCupon());
    this.mensajeCupon.set(res.mensaje);
    this.porcentajeCupon.set(res.valido ? res.porcentaje : 0);
  }

  async confirmarCompra() {
    if (!this.puedeComprar() || this.cargandoPago()) return;

    this.cargandoPago.set(true);
    const user = this.authService.currentUser();
    const data = this.reservaData();
    const total = this.totalPagar();
    const descuentoSaldoUsado = this.descuentoSaldo();
    const puntosCanjeados = this.puntosUsados();
    const itemsCanjeados = this.carritoService.items().filter(i => this.estaCanjeado(i));

    const itemsCandy = this.carritoService.items()
      .filter(i => i.tipo === 'candy')
      .map(i => ({ nombre: i.nombre, cantidad: i.cantidad }));

    const qrCodigo = `TICKET-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    this.qrCodigoRaw.set(qrCodigo);

    try {
      if (data?.asientos && data.asientos.length > 0) {
        // borramos los bloqueos temporales de las butacas que elegimos
        await this.supabase
          .from('reservas')
          .delete()
          .eq('funcion_id', data.funcion_id)
          .eq('estado', 'bloqueada')
          .overlaps('asientos', data.asientos);
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
            fecha_compra: new Date().toISOString(),
            items_candy: itemsCandy,
            candy_entregado: itemsCandy.length === 0,
            metodo_pago: total > 0 ? this.metodoPago() : 'Saldo / Puntos'
          }
        ]);

      if (resError) throw resError;

      if (user && puntosCanjeados > 0) {
        await this.fidelizacionService.descontarPuntos(user.id, puntosCanjeados);
        for (const item of itemsCanjeados) {
          await this.fidelizacionService.registrarCanje(user.id, `${item.cantidad}x ${item.nombre}`, this.puntosItem(item));
        }
      }

      if (user && descuentoSaldoUsado > 0) {
        const nuevoSaldo = Math.max(0, this.saldoDisponible() - descuentoSaldoUsado);
        await this.supabase
          .from('usuarios')
          .update({ saldo_favor: nuevoSaldo })
          .eq('id', user.id);
      }

      // 1 punto por cada peso que pago
      if (user && total > 0) {
        await this.fidelizacionService.sumarPuntos(user.id, total);
      }
      if (user) {
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

      this.datosTicket = {
        tituloPelicula: data?.pelicula?.titulo || 'Película',
        sala: data?.sala || 'Sala General',
        fechaHora: data?.fecha_hora ? new Date(data.fecha_hora).toLocaleString('es-AR') : '',
        asientos: data?.asientos || [],
        total: total,
        qrCodigo: qrCodigo,
        itemsCandy: itemsCandy,
        requiereAdulto: Number(data?.pelicula?.clasificacion_edad) >= 13
      };

      await this.pdfService.generarTicketPDF(this.datosTicket);

      this.carritoService.limpiarCarrito();
      sessionStorage.removeItem('reserva_activa');

    } catch (err: any) {
      console.error('Error al procesar compra o descargar PDF:', err);
      this.modal.avisar('No se pudo completar la compra.');
    } finally {
      this.cargandoPago.set(false);
    }
  }

  descargarTicketPDF() {
    if (this.datosTicket) {
      this.pdfService.generarTicketPDF(this.datosTicket);
    }
  }
}
