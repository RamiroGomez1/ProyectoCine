import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
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

  cargando = signal(false);
  archivoImagen: File | null = null;

  peliculaForm = this.fb.nonNullable.group({
    titulo: ['', Validators.required],
    sinopsis: ['', Validators.required],
    duracionMinutos: [120, [Validators.required, Validators.min(1)]],
    generos: [['Acción'], Validators.required],
    formato: ['2D' as const, Validators.required],
    idioma: ['Castellano' as const, Validators.required],
    clasificacionEdad: [13, Validators.required],
    precioBase: [4000, [Validators.required, Validators.min(0)]],
    esPreventa: [false]
  });

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.archivoImagen = file;
    }
  }

  archivoSeleccionado: File | null = null;
  previewUrl = signal<string | null>(null);

  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const archivo = input.files[0];
    this.archivoSeleccionado = archivo;

    const previewAnterior = this.previewUrl();
    if (previewAnterior) {
      URL.revokeObjectURL(previewAnterior);
    }

    const nuevaPreview = URL.createObjectURL(archivo);
    this.previewUrl.set(nuevaPreview);
  }

  async guardarPelicula() {
    if (this.peliculaForm.invalid) return;

    this.cargando.set(true);
    try {
      const formValues = this.peliculaForm.getRawValue();

      await this.peliculasService.agregarPelicula({
        titulo: formValues.titulo,
        sinopsis: formValues.sinopsis,
        duracionMinutos: formValues.duracionMinutos,
        generos: formValues.generos,
        formato: formValues.formato,
        idioma: formValues.idioma,
        clasificacionEdad: formValues.clasificacionEdad,
        precioBase: formValues.precioBase,
        esPreventa: formValues.esPreventa,
        portadaUrl: ''
      }, this.archivoImagen || undefined);

      alert('¡Película cargada exitosamente a la base de datos!');
      this.peliculaForm.reset();
      this.archivoImagen = null;
    } catch (error) {
      alert('Hubo un error al registrar la película.');
    } finally {
      this.cargando.set(false);
    }
  }
}