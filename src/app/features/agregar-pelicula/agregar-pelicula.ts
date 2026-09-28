import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PeliculasService } from '../../core/services/pelicula.service';

@Component({
  selector: 'app-agregar-pelicula',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './agregar-pelicula.html',
  styleUrl: './agregar-pelicula.css'
})
export class AgregarPeliculaComponent {
  private fb = inject(FormBuilder);
  private peliculasService = inject(PeliculasService);
  private router = inject(Router);

  cargando = signal(false);
  archivoImagen: File | null = null;
  previewUrl = signal<string | null>(null);

  peliculaForm = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(2)]],
    sinopsis: ['', Validators.required],
    duracion_minutos: [120, [Validators.required, Validators.min(1)]],
    generos: [['Acción'], Validators.required],
    formato: ['2D' as const, Validators.required],
    idioma: ['Castellano' as const, Validators.required],
    clasificacion_edad: [13, Validators.required],
    precio_base: [4000, [Validators.required, Validators.min(0)]],
    es_preventa: [false]
  });

  get f() {
    return this.peliculaForm.controls;
  }

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const archivo = input.files[0];
    this.archivoImagen = archivo;

    const previewAnterior = this.previewUrl();
    if (previewAnterior) {
      URL.revokeObjectURL(previewAnterior);
    }

    const nuevaPreview = URL.createObjectURL(archivo);
    this.previewUrl.set(nuevaPreview);
  }

  async guardarPelicula() {
    this.peliculaForm.markAllAsTouched();
    if (this.peliculaForm.invalid) return;

    this.cargando.set(true);
    try {
      const formValues = this.peliculaForm.getRawValue();

      await this.peliculasService.agregarPelicula({
        titulo: formValues.titulo,
        sinopsis: formValues.sinopsis,
        duracionMinutos: Number(formValues.duracion_minutos),
        generos: formValues.generos,
        formato: formValues.formato,
        idioma: formValues.idioma,
        clasificacionEdad: Number(formValues.clasificacion_edad),
        precioBase: Number(formValues.precio_base),
        esPreventa: formValues.es_preventa,
        portadaUrl: ''
      }, this.archivoImagen || undefined);

      alert('¡Película cargada exitosamente a la base de datos!');
      this.peliculaForm.reset();
      this.archivoImagen = null;
      this.previewUrl.set(null);
      this.router.navigate(['/home']);
    } catch (error) {
      console.error(error);
      alert('Hubo un error al registrar la película.');
    } finally {
      this.cargando.set(false);
    }
  }
}