import { Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { FavoritosService, Favorito } from '../../core/services/favoritos.service';
import { ResenasService } from '../../core/services/resenas.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-favoritos',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './favoritos.html',
  styleUrl: './favoritos.css'
})
export class FavoritosComponent implements OnInit {
  favoritosService = inject(FavoritosService);
  private resenasService = inject(ResenasService);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);

  favoritos = this.favoritosService.favoritos;

  editandoId: string | null = null;
  notaControl = this.fb.control('', [Validators.required, Validators.maxLength(200)]);
  estrellasControl = this.fb.control(5, [Validators.required, Validators.min(1), Validators.max(5)]);

  ngOnInit() {
    this.favoritosService.cargarFavoritos();
  }

  eliminar(id: string) {
    if (confirm('¿Estás seguro de que deseas eliminar esta película de tus favoritos?')) {
      this.favoritosService.eliminarFavorito(id);
    }
  }

  iniciarEdicion(fav: Favorito) {
    this.editandoId = fav.id!;
    this.notaControl.setValue(fav.nota || '');
    this.estrellasControl.setValue(5);
  }

  cancelarEdicion() {
    this.editandoId = null;
    this.notaControl.reset();
  }

  async guardarNotaYResena(fav: Favorito) {
    if (this.notaControl.invalid) return;

    const user = this.authService.currentUser();
    const comentario = this.notaControl.value || '';
    const puntuacion = Number(this.estrellasControl.value) || 5;

    try {
      if (user && fav.pelicula_id) {
        await this.resenasService.agregarResena({
          pelicula_id: fav.pelicula_id,
          user_id: user.id,
          puntuacion: puntuacion,
          comentario: comentario
        });
      }

      await this.favoritosService.actualizarNota(fav.id!, comentario);

      alert('¡Reseña y calificación guardadas exitosamente en Supabase!');
      this.editandoId = null;
    } catch (err: any) {
      console.error('Error al guardar reseña:', err);
      alert(`Error al guardar: ${err.message || 'Intente nuevamente'}`);
    }
  }
}