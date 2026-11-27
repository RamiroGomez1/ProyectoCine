import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import jsPDF from 'jspdf';

export interface FilaFacturacion {
  fecha: string;
  entradas: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class ReportesService {
  private supabase = inject(SupabaseService).client;

  async obtenerLogsActividad() {
    const { data: logs, error } = await this.supabase
      .from('logs_auditoria')
      .select('*')
      .order('fecha_hora', { ascending: false })
      .limit(50);

    if (error || !logs) return [];

    // buscamos los nombres de los usuarios que hicieron cada accion
    const ids = [...new Set(logs.map(l => l.usuario_id))];
    const { data: usuarios } = await this.supabase
      .from('usuarios')
      .select('id, nombre, apellido')
      .in('id', ids);

    return logs.map(l => ({
      ...l,
      usuario: (usuarios || []).find(u => u.id === l.usuario_id)
    }));
  }

  // todas las compras pagadas (las canceladas no cuentan)
  async obtenerVentas() {
    const { data, error } = await this.supabase
      .from('reservas')
      .select('id, total_pagar, asientos, items_candy, fecha_compra, funciones(peliculas(titulo))')
      .in('estado', ['confirmada', 'usada'])
      .order('fecha_compra', { ascending: false });

    if (error) {
      console.error('Error al obtener ventas:', error.message);
      return [];
    }
    return data || [];
  }

  facturacionPorDia(ventas: any[]): FilaFacturacion[] {
    const dias: { [fecha: string]: FilaFacturacion } = {};

    ventas.forEach(v => {
      const fecha = new Date(v.fecha_compra).toLocaleDateString('es-AR');
      if (!dias[fecha]) {
        dias[fecha] = { fecha, entradas: 0, total: 0 };
      }
      dias[fecha].entradas += Array.isArray(v.asientos) ? v.asientos.length : 0;
      dias[fecha].total += Number(v.total_pagar || 0);
    });

    return Object.values(dias);
  }

  // cuenta las entradas vendidas de cada pelicula en los ultimos X dias
  peliculasMasVistas(ventas: any[], dias: number) {
    const desde = Date.now() - dias * 24 * 60 * 60 * 1000;
    const conteo: { [titulo: string]: number } = {};

    ventas
      .filter(v => new Date(v.fecha_compra).getTime() >= desde)
      .forEach(v => {
        const titulo = v.funciones?.peliculas?.titulo || 'Sin título';
        conteo[titulo] = (conteo[titulo] || 0) + (Array.isArray(v.asientos) ? v.asientos.length : 0);
      });

    return Object.entries(conteo)
      .map(([nombre, entradas]) => ({ nombre, entradas }))
      .sort((a, b) => b.entradas - a.entradas)
      .slice(0, 5);
  }

  productoMasVendido(ventas: any[]) {
    const conteo: { [nombre: string]: number } = {};

    ventas.forEach(v => {
      (v.items_candy || []).forEach((item: any) => {
        conteo[item.nombre] = (conteo[item.nombre] || 0) + Number(item.cantidad || 0);
      });
    });

    const ordenados = Object.entries(conteo).sort((a, b) => b[1] - a[1]);
    if (ordenados.length === 0) return null;
    return { nombre: ordenados[0][0], cantidad_vendida: ordenados[0][1] };
  }

  exportarFacturacion(formato: 'pdf' | 'excel', filas: FilaFacturacion[]) {
    const totalFacturado = filas.reduce((acc, f) => acc + f.total, 0);
    const totalEntradas = filas.reduce((acc, f) => acc + f.entradas, 0);

    if (formato === 'pdf') {
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
      doc.text(`Fecha de emisión: ${new Date().toLocaleString('es-AR')}`, 20, 33);

      doc.setDrawColor(34, 34, 59);
      doc.setLineWidth(0.5);
      doc.line(20, 38, 190, 38);

      doc.setFontSize(12);
      doc.setTextColor(0, 184, 148);
      doc.text(`Total Facturado: $${totalFacturado.toLocaleString('es-AR')}`, 20, 48);
      doc.setTextColor(255, 255, 255);
      doc.text(`Total Entradas Vendidas: ${totalEntradas}`, 20, 56);

      doc.line(20, 62, 190, 62);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(140, 140, 158);
      doc.text('Día', 20, 70);
      doc.text('Entradas vendidas', 85, 70);
      doc.text('Facturado', 150, 70);

      doc.setFont('helvetica', 'normal');
      let y = 78;

      filas.forEach(f => {
        if (y > 285) {
          doc.addPage();
          doc.setFillColor(18, 18, 30);
          doc.rect(0, 0, 210, 297, 'F');
          y = 20;
        }
        doc.setTextColor(200, 200, 200);
        doc.text(f.fecha, 20, y);
        doc.text(String(f.entradas), 85, y);
        doc.setTextColor(0, 184, 148);
        doc.text(`$${f.total.toLocaleString('es-AR')}`, 150, y);
        y += 8;
      });

      doc.save(`Reporte_Facturacion_${Date.now()}.pdf`);
    } else {
      const cabeceras = ['Dia', 'Entradas vendidas', 'Facturado ($)'];
      const lineas = filas.map(f => [`"${f.fecha}"`, f.entradas, f.total]);
      lineas.push(['"TOTAL"', totalEntradas, totalFacturado]);

      const csvContent = '﻿' + [cabeceras.join(';'), ...lineas.map(f => f.join(';'))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.setAttribute('href', url);
      enlace.setAttribute('download', `Reporte_Facturacion_${Date.now()}.csv`);
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
    }
  }
}
