import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CarritoService } from '../../core/services/carrito.service';
import { CuponesService } from '../../core/services/cupones.service';
import { AuthService } from '../../core/services/auth.service';
import { SupabaseService } from '../../core/services/supabase.service';
import { PdfService } from '../../core/services/pdf.service';
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
  private authService = inject(AuthService);
  private supabase = inject(SupabaseService).client;
  private pdfService = inject(PdfService);
  private router = inject(Router);

  reservaData = signal<any>(null);
  codigoCupon = signal('');
  descuentoAplicado = signal(0);
  mensajeCupon = signal('');

  puedeComprar = signal(true);
  mensajeRestriccion = signal('');

  qrGenerado = signal<string | null>(null);
  qrCodigoRaw = signal<string>('');
  cargandoPago = signal(false);

  totalPagar = computed(() => {
    return Math.max(0, this.carritoService.total() - this.descuentoAplicado());
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
      this.mensajeRestriccion.set(`Película +${restriccion}. Iniciá sesión para verificar tu edad.`); //[cite: 3, 9]
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
      this.mensajeRestriccion.set(`Compra bloqueada: Tenés ${edad} años y la película requiere ser mayor de ${restriccion} años.`); //[cite: 3, 9]
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