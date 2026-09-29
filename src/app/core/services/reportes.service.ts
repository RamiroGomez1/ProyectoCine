import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import jsPDF from 'jspdf';

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private supabase = inject(SupabaseService).client;

  async obtenerLogsActividad() {
    const { data, error } = await this.supabase
      .from('logs_auditoria')
      .select('*')
      .order('fecha_hora', { ascending: false })
      .limit(50);
    return data || [];
  }

  async obtenerPeliculasMasVistas() {
    const { data, error } = await this.supabase
      .from('peliculas')
      .select('titulo, entradas_vendidas')
      .order('entradas_vendidas', { ascending: false })
      .limit(5);
    return data || [];
  }

  async obtenerProductoMasVendidoCandy() {
    const { data, error } = await this.supabase
      .from('productos_candy')
      .select('nombre, precio')
      .limit(1)
      .single();
    return data;
  }

  async exportarFacturacion(formato: 'pdf' | 'excel') {
    if (formato === 'pdf') {
      const { data: reservas, error } = await this.supabase
        .from('reservas')
        .select('id, total_pagar, asientos, estado, fecha_compra')
        .eq('estado', 'confirmada')
        .order('fecha_compra', { ascending: false });

      if (error || !reservas) {
        alert('Error al obtener datos para el reporte.');
        return;
      }

      const totalFacturado = reservas.reduce((acc, r) => acc + Number(r.total_pagar || 0), 0);
      const totalEntradas = reservas.reduce((acc, r) => acc + (Array.isArray(r.asientos) ? r.asientos.length : 1), 0);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFillColor(18, 18, 30);
      doc.rect(0, 0, 210, 297, 'F');

      doc.setTextColor(229, 9, 20); 
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('PROYECTO CINE - REPORTE DE FACTURACIÓN', 20, 25);

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 20, 33);

      doc.setDrawColor(34, 34, 59);
      doc.setLineWidth(0.5);
      doc.line(20, 38, 190, 38);

      doc.setFontSize(12);
      doc.setTextColor(0, 184, 148); // Verde
      doc.text(`Total Facturado: $${totalFacturado.toLocaleString()}`, 20, 48);
      doc.setTextColor(255, 255, 255);
      doc.text(`Total Entradas Vendidas: ${totalEntradas}`, 20, 56);
      doc.text(`Cantidad de Operaciones: ${reservas.length}`, 20, 64);

      doc.line(20, 70, 190, 70);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(140, 140, 158);
      doc.text('ID Reserva', 20, 78);
      doc.text('Fecha', 85, 78);
      doc.text('Butacas', 135, 78);
      doc.text('Total', 170, 78);

      doc.setFont('helvetica', 'normal');
      let y = 86;

      reservas.slice(0, 25).forEach(r => {
        doc.setTextColor(200, 200, 200);
        doc.text(String(r.id).substring(0, 8) + '...', 20, y);
        doc.text(new Date(r.fecha_compra).toLocaleDateString(), 85, y);
        doc.text(`${Array.isArray(r.asientos) ? r.asientos.length : 1} entrada(s)`, 135, y);
        doc.setTextColor(0, 184, 148);
        doc.text(`$${r.total_pagar}`, 170, y);
        y += 8;
      });

      doc.save(`Reporte_Facturacion_${Date.now()}.pdf`);
    } else {
      console.log('Exportación a Excel solicitada');
    }
  }
}