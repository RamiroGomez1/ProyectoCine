import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReportesService } from '../../../core/services/reportes.service';
import { CineService } from '../../../core/services/cine.service';
import { PeliculasService } from '../../../core/services/pelicula.service';
import { ProductoService } from '../../../core/services/producto-service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ProductoCandyBar } from '../../../core/models/producto.candybar.interface';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private reportesService = inject(ReportesService);
  private cineService = inject(CineService);
  private peliculaService = inject(PeliculasService);
  private productoService = inject(ProductoService);
  private supabaseService = inject(SupabaseService);
  private fb = inject(FormBuilder);

  logs = signal<any[]>([]);
  topPeliculas = signal<any[]>([]);
  topCandy = signal<any>(null);
  listaPeliculas = signal<any[]>([]);
  cargando = signal(true);

  archivoPortada: File | null = null;

  formatosDisponibles = ['2D', '3D', '4D', '5D'];
  idiomasDisponibles = ['Castellano', 'Subtitulada'];

  formatosSeleccionadosPelicula = signal<string[]>(['2D']);
  idiomasSeleccionadosPelicula = signal<string[]>(['Castellano']);

  peliculaSeleccionadaFuncion = signal<any | null>(null);

  precioBaseFuncion = computed(() => {
    const peli = this.peliculaSeleccionadaFuncion();
    return peli ? Number(peli.precio_base ?? peli.precioBase ?? 0) : 0;
  });

  descuentoFuncion = signal<number>(0);

  precioFinalFuncion = computed(() => {
    const base = this.precioBaseFuncion();
    const desc = this.descuentoFuncion();
    const rebaja = (base * desc) / 100;
    return Math.max(0, Math.round(base - rebaja));
  });

  formatosPermitidosFuncion = computed(() => {
    const peli = this.peliculaSeleccionadaFuncion();
    if (!peli) return [];
    if (Array.isArray(peli.formato)) return peli.formato;
    return typeof peli.formato === 'string' ? peli.formato.split(',').map((s: string) => s.trim()) : [];
  });

  idiomasPermitidosFuncion = computed(() => {
    const peli = this.peliculaSeleccionadaFuncion();
    if (!peli) return [];
    if (Array.isArray(peli.idioma)) return peli.idioma;
    return typeof peli.idioma === 'string' ? peli.idioma.split(',').map((s: string) => s.trim()) : [];
  });

  peliculaForm = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(2)]],
    sinopsis: ['', Validators.required],
    duracionMinutos: [120, [Validators.required, Validators.min(1)]],
    portadaUrl: [''],
    generos: [['Acción'] as string[], Validators.required],
    clasificacionEdad: [0, Validators.required],
    precioBase: [4000, [Validators.required, Validators.min(0)]],
    esPreventa: [false]
  });

  funcionForm = this.fb.nonNullable.group({
    peliculaId: ['', Validators.required],
    sala: ['Sala 1', Validators.required],
    fechaHoraInicio: ['', Validators.required],
    porcentajeDescuento: [0, [Validators.min(0), Validators.max(100)]],
    formato: ['', Validators.required],
    idioma: ['', Validators.required]
  });

  candyForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    descripcion: ['', Validators.required],
    precio: [3500, [Validators.required, Validators.min(0)]],
    categoria: ['Combos' as 'Combos' | 'Pochoclos' | 'Bebidas' | 'Golosinas', Validators.required],
    esCombo: [true],
    costoEnPuntos: [300, [Validators.required, Validators.min(0)]],
    imagenUrl: ['']
  });

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      const [logsData, peliculasData, candyData, todasPeliculas] = await Promise.all([
        this.reportesService.obtenerLogsActividad(),
        this.reportesService.obtenerPeliculasMasVistas(),
        this.reportesService.obtenerProductoMasVendidoCandy(),
        this.peliculaService.obtenerPeliculas()
      ]);

      this.logs.set(logsData || []);
      this.topPeliculas.set(peliculasData || []);
      this.topCandy.set(candyData);
      this.listaPeliculas.set(todasPeliculas || []);
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      this.cargando.set(false);
    }
  }

  toggleFormatoPelicula(fmt: string) {
    this.formatosSeleccionadosPelicula.update(items =>
      items.includes(fmt) ? items.filter(i => i !== fmt) : [...items, fmt]
    );
  }

  toggleIdiomaPelicula(idioma: string) {
    this.idiomasSeleccionadosPelicula.update(items =>
      items.includes(idioma) ? items.filter(i => i !== idioma) : [...items, idioma]
    );
  }

  onPeliculaChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const peliId = target.value;
    const peli = this.listaPeliculas().find(p => p.id === peliId);
    this.peliculaSeleccionadaFuncion.set(peli || null);

    this.descuentoFuncion.set(0);
    this.funcionForm.patchValue({
      formato: '',
      idioma: '',
      porcentajeDescuento: 0
    });
  }

  actualizarDescuento(event: Event) {
    const input = event.target as HTMLInputElement;
    const valor = Math.min(100, Math.max(0, Number(input.value) || 0));
    this.descuentoFuncion.set(valor);
  }

  onPeliculaFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.archivoPortada = input.files[0];
    }
  }

  async guardarPelicula() {
    if (this.peliculaForm.invalid) return;

    if (this.formatosSeleccionadosPelicula().length === 0) {
      alert('Debes seleccionar al menos un formato para la película.');
      return;
    }

    if (this.idiomasSeleccionadosPelicula().length === 0) {
      alert('Debes seleccionar al menos un idioma para la película.');
      return;
    }

    const v = this.peliculaForm.getRawValue();
    let finalPortadaUrl = v.portadaUrl;

    try {
      if (this.archivoPortada) {
        const nombreArchivo = `${Date.now()}_${this.archivoPortada.name}`;
        const { error: uploadError } = await this.supabaseService.client.storage
          .from('peliculas')
          .upload(nombreArchivo, this.archivoPortada);

        if (!uploadError) {
          const { data: urlData } = this.supabaseService.client.storage
            .from('peliculas')
            .getPublicUrl(nombreArchivo);
          finalPortadaUrl = urlData.publicUrl;
        }
      }

      const { error } = await this.supabaseService.client
        .from('peliculas')
        .insert([
          {
            titulo: v.titulo,
            sinopsis: v.sinopsis,
            duracion_minutos: Number(v.duracionMinutos),
            portada_url: finalPortadaUrl || null,
            generos: v.generos,
            formato: this.formatosSeleccionadosPelicula().join(','),
            idioma: this.idiomasSeleccionadosPelicula().join(','),
            clasificacion_edad: Number(v.clasificacionEdad),
            precio_base: Number(v.precioBase),
            es_preventa: Boolean(v.esPreventa)
          }
        ]);

      if (error) {
        alert(`Error: ${error.message}`);
        return;
      }

      alert('¡Película registrada exitosamente!');
      this.peliculaForm.reset();
      this.formatosSeleccionadosPelicula.set(['2D']);
      this.idiomasSeleccionadosPelicula.set(['Castellano']);
      this.archivoPortada = null;

      const actualizadas = await this.peliculaService.obtenerPeliculas();
      this.listaPeliculas.set(actualizadas || []);
    } catch (err: any) {
      console.error(err);
      alert('Error inesperado al guardar la película.');
    }
  }

  fechaMinima = new Date().toISOString().slice(0, 16);

async programarFuncion() {
  if (this.funcionForm.invalid) {
    alert('Completa todos los campos obligatorios de la función.');
    return;
  }

  const v = this.funcionForm.getRawValue();

  const fechaSeleccionada = new Date(v.fechaHoraInicio).getTime();
  const ahora = new Date().getTime();

  if (fechaSeleccionada <= ahora) {
    alert('No puedes programar una función en una fecha u hora pasada.');
    return;
  }

  const fechaPlana = v.fechaHoraInicio.replace('T', ' ') + ':00';

  const resultado = await this.cineService.agregarFuncion({
    pelicula_id: v.peliculaId,
    sala: v.sala,
    fecha_hora: fechaPlana,
    precio: this.precioFinalFuncion(),
    formato: v.formato,
    idioma: v.idioma
  });

  if (resultado.exito) {
    alert('¡Función programada con éxito!');
    this.funcionForm.reset({
      peliculaId: '',
      sala: 'Sala 1',
      fechaHoraInicio: '',
      porcentajeDescuento: 0,
      formato: '',
      idioma: ''
    });
    this.peliculaSeleccionadaFuncion.set(null);
    this.descuentoFuncion.set(0);
  } else {
    alert(`Error: ${resultado.mensaje}`);
  }
}

listaProductosCandy = signal<ProductoCandyBar[]>([]);
productoEnEdicionId = signal<string | null>(null);

async cargarProductosCandy() {
  const data = await this.productoService.obtenerProductos();
  this.listaProductosCandy.set(data);
}

editarProducto(prod: ProductoCandyBar) {
  this.productoEnEdicionId.set(prod.id);
  this.candyForm.patchValue({
    nombre: prod.nombre,
    descripcion: prod.descripcion,
    precio: prod.precio,
    categoria: prod.categoria,
    esCombo: prod.esCombo,
    costoEnPuntos: prod.costoEnPuntos ?? 0,
    imagenUrl: prod.imagenUrl
  });
}

cancelarEdicion() {
  this.productoEnEdicionId.set(null);
  this.candyForm.reset({
    nombre: '',
    descripcion: '',
    precio: 3500,
    categoria: 'Combos',
    esCombo: true,
    costoEnPuntos: 300,
    imagenUrl: ''
  });
}

async guardarProductoCandy() {
  if (this.candyForm.invalid) return;
  const val = this.candyForm.getRawValue();

  if (this.productoEnEdicionId()) {
    // Modo Edición
    const res = await this.productoService.actualizarProducto(this.productoEnEdicionId()!, {
      nombre: val.nombre,
      descripcion: val.descripcion,
      precio: Number(val.precio),
      categoria: val.categoria,
      esCombo: val.esCombo,
      costoEnPuntos: Number(val.costoEnPuntos),
      imagenUrl: val.imagenUrl
    });

    if (res.exito) {
      alert('Producto actualizado correctamente');
      this.cancelarEdicion();
      await this.cargarProductosCandy();
    }
  } else {
    const res = await this.productoService.crearProductoOCombo({ ...val, es_combo: val.esCombo, costo_en_puntos: val.costoEnPuntos, imagen_url: val.imagenUrl });
    if (res.exito) {
      this.cancelarEdicion();
      await this.cargarProductosCandy();
    }
  }
}

async eliminarProductoCandy(id: string) {
  if (!confirm('¿Deseas eliminar este producto del Candy Bar?')) return;
  const res = await this.productoService.eliminarProducto(id);
  if (res.exito) {
    await this.cargarProductosCandy();
  } else {
    alert(`Error: ${res.mensaje}`);
  }
}

  exportarPDF() {
    this.reportesService.exportarFacturacion('pdf');
  }

  exportarExcel() {
    this.reportesService.exportarFacturacion('excel');
  }

  
}