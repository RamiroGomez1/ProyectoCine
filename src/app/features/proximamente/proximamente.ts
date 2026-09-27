// Path: src/app/features/proximamente/proximamente.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { PeliculasService } from '../../core/services/pelicula.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertasService } from '../../core/services/alertas.service';

@Component({
  selector: 'app-proximamente',
  standalone: true,
  templateUrl: './proximamente.html',
  styleUrl: './proximamente.css'
})

export class ProximamenteComponent implements OnInit {
  private peliculaService = inject(PeliculasService);
  private authService = inject(AuthService);
  private alertasService = inject(AlertasService);

  peliculasFuturas = signal<any[]>([]);
  cargando = signal(true);
  alertasActivas = signal<string[]>([]); 
  async ngOnInit() {
    try {
      const todas = await this.peliculaService.obtenerPeliculas();
      const hoy = new Date();
      
      const futuras = todas.filter(p => {
        if (!p.fecha_estreno) return false;
        const estreno = new Date(p.fecha_estreno);
        const diffDias = (estreno.getTime() - hoy.getTime()) / (1000 * 3600 * 24);
        return diffDias > 7;
      });

      this.peliculasFuturas.set(futuras);
    } catch (error) {
      console.error("Error al cargar próximos estrenos", error);
    } finally {
      this.cargando.set(false);
    }
  }

  async suscribirse(peliculaId: string) {
    const usuario = this.authService.currentUserData();
    
    if (!usuario) {
      alert('Debés iniciar sesión para activar alertas.');
      return;
    }

    try {
      await this.alertasService.activarAlerta(usuario.id, peliculaId);
      this.alertasActivas.update(alertas => [...alertas, peliculaId]);
      alert('¡Alerta activada exitosamente!');
    } catch (error) {
      alert('Hubo un problema al activar la alerta.');
    }
  }

  tieneAlerta(peliculaId: string): boolean {
    return this.alertasActivas().includes(peliculaId);
  }
}