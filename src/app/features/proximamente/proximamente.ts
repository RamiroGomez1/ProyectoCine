import { Component, inject, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/services/pelicula.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertasService } from '../../core/services/alertas.service';
import { ModalService } from '../../core/services/modal.service';

@Component({
  selector: 'app-proximamente',
  standalone: true,
  imports: [DatePipe, RouterLink],
  templateUrl: './proximamente.html',
  styleUrl: './proximamente.css'
})

export class ProximamenteComponent implements OnInit {
  private peliculaService = inject(PeliculasService);
  private modal = inject(ModalService);
  private authService = inject(AuthService);
  private alertasService = inject(AlertasService);

  peliculasFuturas = signal<any[]>([]);
  cargando = signal(true);
  alertasActivas = signal<string[]>([]); 
  async ngOnInit() {
    try {
      const todas = await this.peliculaService.obtenerPeliculas();
      const hoy = new Date();
      
      // las que todavia no se estrenaron
      const futuras = todas.filter(p => {
        if (!p.fecha_estreno || p.visible === false) return false;
        return new Date(p.fecha_estreno + 'T00:00:00') > hoy;
      });

      this.peliculasFuturas.set(futuras);

      await this.authService.esperarSesion();
      const usuario = this.authService.currentUser();
      if (usuario) {
        this.alertasActivas.set(await this.alertasService.obtenerAlertas(usuario.id));
      }
    } catch (error) {
      console.error("Error al cargar próximos estrenos", error);
    } finally {
      this.cargando.set(false);
    }
  }

  async suscribirse(peliculaId: string) {
    const usuario = this.authService.currentUserData();
    
    if (!usuario) {
      this.modal.avisar('Debés iniciar sesión para activar alertas.');
      return;
    }

    try {
      await this.alertasService.activarAlerta(usuario.id, peliculaId);
      this.alertasActivas.update(alertas => [...alertas, peliculaId]);
      this.modal.avisar('¡Alerta activada exitosamente!');
    } catch (error) {
      this.modal.avisar('Hubo un problema al activar la alerta.');
    }
  }

  ventaAbierta(peli: any): boolean {
    return this.peliculaService.ventaAbierta(peli);
  }

  tieneAlerta(peliculaId: string): boolean {
    return this.alertasActivas().includes(peliculaId);
  }
}