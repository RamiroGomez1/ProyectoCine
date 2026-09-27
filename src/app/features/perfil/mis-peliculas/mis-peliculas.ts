import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { ResenasService } from '../../../core/services/resenas.service';

@Component({
  selector: 'app-mis-peliculas',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './mis-peliculas.html',
  styleUrl: './mis-peliculas.css'
})
export class MisPeliculasComponent implements OnInit {
  private authService = inject(AuthService);
  private resenasService = inject(ResenasService);

  historial = signal<any[]>([]);
  cargando = signal(true);
  
  peliculaSeleccionada = signal<string | null>(null);
  estrellasSeleccionadas = signal<number>(5);
  comentario = signal<string>('');

  async ngOnInit() {
    const user = this.authService.currentUserData();
    if (user) {
      try {
        const data = await this.resenasService.obtenerHistorialUsuario(user.id);
        this.historial.set(data);
      } catch (error) {
        console.error('Error al cargar historial');
      } finally {
        this.cargando.set(false);
      }
    }
  }

  abrirResena(peliculaId: string) {
    this.peliculaSeleccionada.set(peliculaId);
    this.estrellasSeleccionadas.set(5);
    this.comentario.set('');
  }

  async enviarResena() {
    const user = this.authService.currentUserData();
    const peliculaId = this.peliculaSeleccionada();
    
    if (user && peliculaId) {
      await this.resenasService.agregarResena({
        pelicula_id: peliculaId,
        usuario_id: user.id,
        estrellas: this.estrellasSeleccionadas(),
        comentario: this.comentario()
      });
      
      this.peliculaSeleccionada.set(null); 
      alert('¡Gracias por tu reseña!');
    }
  }
}