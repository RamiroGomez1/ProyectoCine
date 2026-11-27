import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { PeliculasService } from '../../core/services/pelicula.service';
import { AuthService } from '../../core/services/auth.service';
import { AlertasService } from '../../core/services/alertas.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class HomeComponent implements OnInit {
  private peliculaService = inject(PeliculasService);
  private authService = inject(AuthService);
  private alertasService = inject(AlertasService);

  peliculas = signal<any[]>([]);
  top3Vendidas = signal<any[]>([]);
  cargando = signal(true);
  busqueda = signal<string>('');
  filtroGenero = signal<string>('');
  avisos = signal<string[]>([]);

  // todos los generos de las peliculas en cartelera, sin repetir
  generos = computed(() => {
    const todos = this.peliculas().flatMap(p => Array.isArray(p.generos) ? p.generos : []);
    return [...new Set(todos)].sort();
  });

  peliculasFiltradas = computed(() => {
    const texto = this.busqueda().toLowerCase().trim();
    const genero = this.filtroGenero();

    return this.peliculas().filter(peli => {
      const coincideTitulo = !texto || peli.titulo.toLowerCase().includes(texto);
      const coincideGenero = !genero || (Array.isArray(peli.generos) && peli.generos.includes(genero));
      return coincideTitulo && coincideGenero;
    });
  });

  async ngOnInit() {
    try {
      const [top3, todas] = await Promise.all([
        this.peliculaService.obtenerTop3Vendidas(),
        this.peliculaService.obtenerPeliculas()
      ]);

      // solo las que el admin dejo visibles y que ya tienen la venta abierta
      const cartelera = todas.filter(p => p.visible !== false && this.peliculaService.ventaAbierta(p));

      this.top3Vendidas.set(top3);
      this.peliculas.set(cartelera);
    } catch (error) {
      console.error('Error cargando cartelera:', error);
    } finally {
      this.cargando.set(false);
    }

    await this.authService.esperarSesion();
    const user = this.authService.currentUser();
    if (user) {
      this.avisos.set(await this.alertasService.revisarAlertas(user.id));
    }
  }
}
