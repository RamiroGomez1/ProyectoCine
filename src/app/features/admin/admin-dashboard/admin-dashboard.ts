import { Component, inject, OnInit, signal } from '@angular/core';
import { ReportesService } from '../../../core/services/reportes.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboardComponent implements OnInit {
  private reportesService = inject(ReportesService);

  logs = signal<any[]>([]);
  topPeliculas = signal<any[]>([]);
  topCandy = signal<any>(null);
  cargando = signal(true);

  async ngOnInit() {
    try {
      const [logsData, peliculasData, candyData] = await Promise.all([
        this.reportesService.obtenerLogsActividad(),
        this.reportesService.obtenerPeliculasMasVistas(),
        this.reportesService.obtenerProductoMasVendidoCandy()
      ]);

      this.logs.set(logsData);
      this.topPeliculas.set(peliculasData);
      this.topCandy.set(candyData);
    } catch (error) {
      console.error("Error al cargar el panel de control", error);
    } finally {
      this.cargando.set(false);
    }
  }

  exportarPDF() {
    this.reportesService.exportarFacturacion('pdf');
  }

  exportarExcel() {
    this.reportesService.exportarFacturacion('excel');
  }
}