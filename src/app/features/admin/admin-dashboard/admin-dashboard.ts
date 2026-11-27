import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ReportesService, FilaFacturacion } from '../../../core/services/reportes.service';
import { CineService } from '../../../core/services/cine.service';
import { PeliculasService } from '../../../core/services/pelicula.service';
import { ProductoService } from '../../../core/services/producto-service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { CuponesService, Cupon } from '../../../core/services/cupones.service';
import { FidelizacionService } from '../../../core/services/fidelizacion.service';
import { AuditoriaService } from '../../../core/services/auditoria.service';
import { ProductoCandyBar } from '../../../core/models/producto.candybar.interface';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { ModalService } from '../../../core/services/modal.service';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboardComponent implements OnInit {
  authService = inject(AuthService);
  private modal = inject(ModalService);
  private reportesService = inject(ReportesService);
  private cineService = inject(CineService);
  private peliculaService = inject(PeliculasService);
  private productoService = inject(ProductoService);
  private supabaseService = inject(SupabaseService);
  private cuponesService = inject(CuponesService);
  private fidelizacionService = inject(FidelizacionService);
  private auditoria = inject(AuditoriaService);
  private fb = inject(FormBuilder);

  logs = signal<any[]>([]);
  ventas = signal<any[]>([]);
  listaPeliculas = signal<any[]>([]);
  salas = signal<{ id: string; nombre: string }[]>([]);
  funciones = signal<any[]>([]);
  cupones = signal<Cupon[]>([]);
  puntosEntrada = signal<number>(500);
  cargando = signal(true);

  // reportes calculados a partir de las ventas
  facturacionDiaria = computed<FilaFacturacion[]>(() => this.reportesService.facturacionPorDia(this.ventas()));
  topSemana = computed(() => this.reportesService.peliculasMasVistas(this.ventas(), 7));
  topMes = computed(() => this.reportesService.peliculasMasVistas(this.ventas(), 30));
  topCandy = computed(() => this.reportesService.productoMasVendido(this.ventas()));

  archivoPortada: File | null = null;

  formatosDisponibles = ['2D', '3D', '4D', '5D'];
  idiomasDisponibles = ['Castellano', 'Subtitulada'];
  diasSemana = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  formatosSeleccionadosPelicula = signal<string[]>(['2D']);
  idiomasSeleccionadosPelicula = signal<string[]>(['Castellano']);
  diasSeleccionados = signal<number[]>([]);

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
    fechaEstreno: [''],
    esPreventa: [false],
    precioPreventa: [0, Validators.min(0)]
  });

  funcionForm = this.fb.nonNullable.group({
    peliculaId: ['', Validators.required],
    fechaDesde: ['', Validators.required],
    fechaHasta: ['', Validators.required],
    hora: ['18:00', Validators.required],
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

  cuponForm = this.fb.nonNullable.group({
    codigo: ['', [Validators.required, Validators.minLength(3)]],
    porcentaje: [10, [Validators.required, Validators.min(1), Validators.max(100)]]
  });

  salaForm = this.fb.nonNullable.group({
    nombre: ['', Validators.required]
  });

  async ngOnInit() {
    await this.cargarDatos();
  }

  async cargarDatos() {
    try {
      const [logsData, ventasData, todasPeliculas, salasData, cuponesData, puntos] = await Promise.all([
        this.reportesService.obtenerLogsActividad(),
        this.reportesService.obtenerVentas(),
        this.peliculaService.obtenerPeliculas(),
        this.cineService.obtenerSalas(),
        this.cuponesService.obtenerCupones(),
        this.fidelizacionService.obtenerPuntosEntrada()
      ]);

      this.logs.set(logsData || []);
      this.ventas.set(ventasData || []);
      this.listaPeliculas.set(todasPeliculas || []);
      this.salas.set(salasData);
      this.cupones.set(cuponesData);
      this.puntosEntrada.set(puntos);
      this.funciones.set(await this.cineService.obtenerFuncionesProgramadas());
      await this.cargarProductosCandy();
    } catch (error) {
      console.error('Error al cargar datos del dashboard:', error);
    } finally {
      this.cargando.set(false);
    }
  }

  // guarda la accion en el log y refresca la tabla
  async registrarLog(tipo: string, detalle: string) {
    const admin = this.authService.currentUser();
    if (!admin) return;
    await this.auditoria.registrarAccion(admin.id, tipo, detalle);
    this.logs.set(await this.reportesService.obtenerLogsActividad());
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

  toggleDia(dia: number) {
    this.diasSeleccionados.update(items =>
      items.includes(dia) ? items.filter(i => i !== dia) : [...items, dia]
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
      this.modal.avisar('Debes seleccionar al menos un formato para la película.');
      return;
    }

    if (this.idiomasSeleccionadosPelicula().length === 0) {
      this.modal.avisar('Debes seleccionar al menos un idioma para la película.');
      return;
    }

    const v = this.peliculaForm.getRawValue();

    if (v.esPreventa && (!v.fechaEstreno || !v.precioPreventa)) {
      this.modal.avisar('Para la preventa tenés que cargar la fecha de estreno y el precio de preventa.');
      return;
    }

    let finalPortadaUrl = v.portadaUrl;

    try {
      if (this.archivoPortada) {
        const url = await this.subirPortada(this.archivoPortada);
        if (!url) return;
        finalPortadaUrl = url;
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
            fecha_estreno: v.fechaEstreno || null,
            es_preventa: Boolean(v.esPreventa),
            precio_preventa: Number(v.precioPreventa) || 0,
            visible: true
          }
        ]);

      if (error) {
        this.modal.avisar(`Error: ${error.message}`);
        return;
      }

      this.modal.avisar('¡Película registrada exitosamente!');
      await this.registrarLog('Alta de película', `Se creó la película "${v.titulo}"`);
      this.peliculaForm.reset();
      this.formatosSeleccionadosPelicula.set(['2D']);
      this.idiomasSeleccionadosPelicula.set(['Castellano']);
      this.archivoPortada = null;

      const actualizadas = await this.peliculaService.obtenerPeliculas();
      this.listaPeliculas.set(actualizadas || []);
    } catch (err: any) {
      console.error(err);
      this.modal.avisar('Error inesperado al guardar la película.');
    }
  }

  // sube la imagen al storage de supabase y devuelve la url publica
  async subirPortada(archivo: File): Promise<string | null> {
    const nombreArchivo = `${Date.now()}_${archivo.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
    const { error: uploadError } = await this.supabaseService.client.storage
      .from('peliculas')
      .upload(nombreArchivo, archivo);

    if (uploadError) {
      this.modal.avisar(`No se pudo subir la portada: ${uploadError.message}`);
      return null;
    }

    const { data: urlData } = this.supabaseService.client.storage
      .from('peliculas')
      .getPublicUrl(nombreArchivo);
    return urlData.publicUrl;
  }

  async cambiarPortada(peli: any, event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const url = await this.subirPortada(input.files[0]);
    if (!url) return;

    const res = await this.peliculaService.actualizarPelicula(peli.id, { portada_url: url });
    if (!res.exito) {
      this.modal.avisar(`Error: ${res.mensaje}`);
      return;
    }
    this.listaPeliculas.update(lista => lista.map(p => p.id === peli.id ? { ...p, portada_url: url } : p));
    await this.registrarLog('Cartelera', `Se cambió la portada de "${peli.titulo}"`);
  }

  async cambiarVisibilidad(peli: any) {
    const res = await this.peliculaService.actualizarPelicula(peli.id, { visible: !peli.visible });
    if (!res.exito) {
      this.modal.avisar(`Error: ${res.mensaje}`);
      return;
    }
    this.listaPeliculas.update(lista => lista.map(p => p.id === peli.id ? { ...p, visible: !peli.visible } : p));
    await this.registrarLog('Cartelera', `"${peli.titulo}" ${peli.visible ? 'se ocultó de' : 'se muestra en'} la cartelera`);
  }

  async cambiarPrecioPelicula(peli: any, event: Event) {
    const nuevoPrecio = Number((event.target as HTMLInputElement).value);
    if (!nuevoPrecio || nuevoPrecio === Number(peli.precio_base)) return;

    const res = await this.peliculaService.actualizarPelicula(peli.id, { precio_base: nuevoPrecio });
    if (!res.exito) {
      this.modal.avisar(`Error: ${res.mensaje}`);
      return;
    }
    await this.registrarLog('Modificación de precio', `"${peli.titulo}": $${peli.precio_base} → $${nuevoPrecio}`);
    this.listaPeliculas.update(lista => lista.map(p => p.id === peli.id ? { ...p, precio_base: nuevoPrecio } : p));
  }

  fechaMinima = new Date().toISOString().slice(0, 10);

  // arma la lista de fechas entre desde y hasta que caen en los dias elegidos
  armarFechas(desde: string, hasta: string, hora: string): string[] {
    const fechas: string[] = [];
    const dia = new Date(desde + 'T00:00:00');
    const fin = new Date(hasta + 'T00:00:00');

    while (dia <= fin) {
      if (this.diasSeleccionados().includes(dia.getDay())) {
        const anio = dia.getFullYear();
        const mes = String(dia.getMonth() + 1).padStart(2, '0');
        const d = String(dia.getDate()).padStart(2, '0');
        fechas.push(`${anio}-${mes}-${d}T${hora}:00`);
      }
      dia.setDate(dia.getDate() + 1);
    }
    return fechas;
  }

  async programarFuncion() {
    if (this.funcionForm.invalid) {
      this.modal.avisar('Completa todos los campos obligatorios de la función.');
      return;
    }

    if (this.diasSeleccionados().length === 0) {
      this.modal.avisar('Elegí al menos un día de la semana.');
      return;
    }

    const v = this.funcionForm.getRawValue();

    if (v.fechaHasta < v.fechaDesde) {
      this.modal.avisar('La fecha "hasta" no puede ser anterior a la fecha "desde".');
      return;
    }

    const ahora = new Date().getTime();
    const fechas = this.armarFechas(v.fechaDesde, v.fechaHasta, v.hora)
      .filter(f => new Date(f).getTime() > ahora);

    if (fechas.length === 0) {
      this.modal.avisar('No hay ninguna fecha futura que coincida con los días elegidos.');
      return;
    }

    const resultado = await this.cineService.programarFunciones({
      pelicula_id: v.peliculaId,
      fechas,
      precio: this.precioFinalFuncion(),
      formato: v.formato,
      idioma: v.idioma
    });

    if (!resultado.exito) {
      this.modal.avisar(`Error: ${resultado.mensaje}`);
      return;
    }

    let mensaje = `Se programaron ${resultado.creadas.length} funciones.`;
    if (resultado.sinSala.length > 0) {
      mensaje += `\nNo había salas libres para: ${resultado.sinSala.map(f => f.replace('T', ' ').slice(0, 16)).join(', ')}`;
    }
    this.modal.avisar(mensaje);

    if (resultado.creadas.length > 0) {
      const titulo = this.peliculaSeleccionadaFuncion()?.titulo;
      await this.registrarLog('Alta de funciones', `${resultado.creadas.length} funciones de "${titulo}" (${resultado.creadas.map(c => c.sala + ' ' + c.fecha.replace('T', ' ').slice(0, 16)).join(', ')})`);
    }

    this.funcionForm.reset({
      peliculaId: '',
      fechaDesde: '',
      fechaHasta: '',
      hora: '18:00',
      porcentajeDescuento: 0,
      formato: '',
      idioma: ''
    });
    this.diasSeleccionados.set([]);
    this.peliculaSeleccionadaFuncion.set(null);
    this.descuentoFuncion.set(0);
    this.funciones.set(await this.cineService.obtenerFuncionesProgramadas());
  }

  async eliminarFuncion(fun: any) {
    if (!(await this.modal.confirmar(`¿Borrar la función de "${fun.peliculas?.titulo}" en ${fun.sala}?`))) return;
    const res = await this.cineService.eliminarFuncion(fun.id);
    if (!res.exito) {
      this.modal.avisar(res.mensaje || 'No se pudo borrar la función.');
      return;
    }
    await this.registrarLog('Baja de función', `Se borró la función de "${fun.peliculas?.titulo}" en ${fun.sala} (${fun.fecha_hora.replace('T', ' ').slice(0, 16)})`);
    this.funciones.set(await this.cineService.obtenerFuncionesProgramadas());
  }

  async agregarSala() {
    if (this.salaForm.invalid) return;
    const nombre = this.salaForm.getRawValue().nombre;
    const res = await this.cineService.agregarSala(nombre);
    if (!res.exito) {
      this.modal.avisar(`Error: ${res.mensaje}`);
      return;
    }
    this.salaForm.reset();
    this.salas.set(await this.cineService.obtenerSalas());
    await this.registrarLog('Alta de sala', `Se agregó la sala "${nombre}"`);
  }

  async eliminarSala(sala: { id: string; nombre: string }) {
    if (!(await this.modal.confirmar(`¿Eliminar la ${sala.nombre}?`))) return;
    const res = await this.cineService.eliminarSala(sala.id);
    if (!res.exito) {
      this.modal.avisar(`Error: ${res.mensaje}`);
      return;
    }
    this.salas.set(await this.cineService.obtenerSalas());
    await this.registrarLog('Baja de sala', `Se eliminó la sala "${sala.nombre}"`);
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
    const anterior = this.listaProductosCandy().find(p => p.id === this.productoEnEdicionId());
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
      this.modal.avisar('Producto actualizado correctamente');
      if (anterior && anterior.precio !== Number(val.precio)) {
        await this.registrarLog('Modificación de precio', `"${val.nombre}": $${anterior.precio} → $${val.precio}`);
      } else {
        await this.registrarLog('Edición de producto', `Se editó "${val.nombre}"`);
      }
      this.cancelarEdicion();
      await this.cargarProductosCandy();
    } else {
      this.modal.avisar(`Error: ${res.mensaje}`);
    }
  } else {
    const res = await this.productoService.crearProductoOCombo({
      nombre: val.nombre,
      descripcion: val.descripcion,
      precio: Number(val.precio),
      categoria: val.categoria,
      es_combo: val.esCombo,
      costo_en_puntos: Number(val.costoEnPuntos),
      imagen_url: val.imagenUrl
    });
    if (res.exito) {
      await this.registrarLog('Alta de producto', `Se creó "${val.nombre}" a $${val.precio}`);
      this.cancelarEdicion();
      await this.cargarProductosCandy();
    } else {
      this.modal.avisar(`Error: ${res.mensaje}`);
    }
  }
}

async eliminarProductoCandy(id: string) {
  if (!(await this.modal.confirmar('¿Deseas eliminar este producto del Candy Bar?'))) return;
  const prod = this.listaProductosCandy().find(p => p.id === id);
  const res = await this.productoService.eliminarProducto(id);
  if (res.exito) {
    await this.registrarLog('Baja de producto', `Se eliminó "${prod?.nombre}"`);
    await this.cargarProductosCandy();
  } else {
    this.modal.avisar(`Error: ${res.mensaje}`);
  }
}

  async cambiarPorcentajeCupon(cupon: Cupon, event: Event) {
    const porcentaje = Number((event.target as HTMLInputElement).value);
    if (!porcentaje || porcentaje === Number(cupon.porcentaje) || porcentaje > 100) return;

    const res = await this.cuponesService.actualizarPorcentaje(cupon.id!, porcentaje);
    if (!res.exito) {
      this.modal.avisar(`Error: ${res.mensaje}`);
      return;
    }
    await this.registrarLog('Modificación de cupón', `${cupon.codigo}: ${cupon.porcentaje}% → ${porcentaje}%`);
    this.cupones.set(await this.cuponesService.obtenerCupones());
  }

  async crearCupon() {
    if (this.cuponForm.invalid) return;
    const v = this.cuponForm.getRawValue();

    const res = await this.cuponesService.crearCupon({
      codigo: v.codigo,
      porcentaje: Number(v.porcentaje),
      tipo: 'mayores_50'
    });

    if (!res.exito) {
      this.modal.avisar(`Error: ${res.mensaje}`);
      return;
    }
    await this.registrarLog('Alta de cupón', `Cupón ${v.codigo.toUpperCase()} (${v.porcentaje}%) para mayores de 50`);
    this.cuponForm.reset({ codigo: '', porcentaje: 10 });
    this.cupones.set(await this.cuponesService.obtenerCupones());
  }

  async eliminarCupon(cupon: Cupon) {
    if (!(await this.modal.confirmar(`¿Eliminar el cupón ${cupon.codigo}?`))) return;
    const res = await this.cuponesService.eliminarCupon(cupon.id!);
    if (res.exito) {
      await this.registrarLog('Baja de cupón', `Se eliminó el cupón ${cupon.codigo}`);
      this.cupones.set(await this.cuponesService.obtenerCupones());
    }
  }

  async guardarPuntosEntrada(event: Event) {
    const puntos = Number((event.target as HTMLInputElement).value);
    if (!puntos || puntos === this.puntosEntrada()) return;

    if (await this.fidelizacionService.guardarPuntosEntrada(puntos)) {
      await this.registrarLog('Fidelización', `Entrada gratis: ${this.puntosEntrada()} → ${puntos} puntos`);
      this.puntosEntrada.set(puntos);
      this.funciones.set(await this.cineService.obtenerFuncionesProgramadas());
    }
  }

  // ancho de la barra del grafico en %
  anchoBarra(entradas: number, lista: { entradas: number }[]): number {
    const max = Math.max(...lista.map(p => p.entradas), 1);
    return Math.round((entradas / max) * 100);
  }

  exportarPDF() {
    this.reportesService.exportarFacturacion('pdf', this.facturacionDiaria());
  }

  exportarExcel() {
    this.reportesService.exportarFacturacion('excel', this.facturacionDiaria());
  }
}
