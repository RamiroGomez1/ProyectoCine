import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import * as QRCode from 'qrcode';

export interface DatosTicketPDF {
  tituloPelicula: string;
  sala: string;
  fechaHora: string;
  asientos: string[];
  total: number;
  qrCodigo: string;
  itemsCandy?: { nombre: string; cantidad: number }[];
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  async generarTicketPDF(datos: DatosTicketPDF): Promise<void> {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [105, 175] 
    });

    doc.setFillColor(18, 18, 30);
    doc.rect(0, 0, 105, 175, 'F');

    doc.setTextColor(229, 9, 20); 
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PROYECTO CINE', 52.5, 14, { align: 'center' });

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Entrada Oficial de Cine', 52.5, 20, { align: 'center' });

    doc.setDrawColor(34, 34, 59);
    doc.setLineWidth(0.5);
    doc.line(10, 24, 95, 24);

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(datos.tituloPelicula, 10, 32);

    doc.setTextColor(160, 160, 180);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Sala: ${datos.sala}`, 10, 39);
    doc.text(`Fecha y Hora: ${datos.fechaHora}`, 10, 45);
    doc.text(`Butacas: ${datos.asientos.join(', ')}`, 10, 51);

    let yOffset = 58;
    if (datos.itemsCandy && datos.itemsCandy.length > 0) {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('Candy Bar:', 10, yOffset);
      yOffset += 5;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(160, 160, 180);
      datos.itemsCandy.forEach(item => {
        doc.text(`• ${item.cantidad}x ${item.nombre}`, 12, yOffset);
        yOffset += 5;
      });
    }

    doc.line(10, yOffset, 95, yOffset);
    yOffset += 7;

    doc.setTextColor(0, 184, 148); 
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(`Total Pagado: $${datos.total}`, 10, yOffset);

    try {
      const qrDataUrl = await QRCode.toDataURL(datos.qrCodigo, {
        margin: 1,
        width: 150,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      const qrSize = 42;
      const xQr = (105 - qrSize) / 2;
      const yQr = yOffset + 6;

      doc.addImage(qrDataUrl, 'PNG', xQr, yQr, qrSize, qrSize);

      doc.setTextColor(140, 140, 158);
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.text(datos.qrCodigo, 52.5, yQr + qrSize + 5, { align: 'center' });
      doc.text('Presentá este código en Sala y Candy Bar', 52.5, yQr + qrSize + 9, { align: 'center' }); 

    } catch (err) {
      console.error('Error al generar código QR en PDF:', err);
    }

    doc.save(`Ticket_${datos.tituloPelicula.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
  }
}