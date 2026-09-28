import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface Favorito {
  id?: string;
  user_id?: string;
  pelicula_id: string;
  nota: string;
  peliculas?: {
    id: string;
    titulo: string;
    genero: string;
    portada_url: string;
    estreno: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class FavoritosService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  favoritos = signal<Favorito[]>([]);
  cargando = signal(false);

  async cargarFavoritos() {
    const user = this.authService.currentUser();
    if (!user) return;

    this.cargando.set(true);
    const { data, error } = await this.supabase
      .from('favoritos')
      .select('*, peliculas(*)')
      .eq('user_id', user.id);

    if (error) {
      console.error('Error al cargar favoritos:', error.message);
    } else {
      this.favoritos.set(data || []);
    }
    this.cargando.set(false);
  }

  async agregarFavorito(favorito: Pick<Favorito, 'pelicula_id' | 'nota'>) {
    const user = this.authService.currentUser();
    if (!user) {
      alert('Debes iniciar sesión para agregar a favoritos');
      return;
    }

    const { data, error } = await this.supabase
      .from('favoritos')
      .insert([{ ...favorito, user_id: user.id }])
      .select('*, peliculas(*)')
      .single();

    if (error) {
      console.error('Error al agregar favorito:', error.message);
      alert('Error al guardar el favorito.');
    } else if (data) {
      this.favoritos.update(favs => [data, ...favs]);
      alert('¡Película agregada a favoritos!');
    }
  }

  async actualizarNota(id: string, nuevaNota: string) {
    const { data, error } = await this.supabase
      .from('favoritos')
      .update({ nota: nuevaNota })
      .eq('id', id)
      .select('*, peliculas(*)')
      .single();

    if (error) {
      console.error('Error al actualizar nota:', error.message);
    } else if (data) {
      this.favoritos.update(favs => 
        favs.map(f => f.id === id ? data : f)
      );
    }
  }

  async eliminarFavorito(id: string) {
    const { error } = await this.supabase
      .from('favoritos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error al eliminar favorito:', error.message);
    } else {
      this.favoritos.update(favs => favs.filter(f => f.id !== id));
    }
  }
}