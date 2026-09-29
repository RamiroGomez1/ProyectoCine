import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/services/supabase.service';
import { CarritoService } from '../../core/services/carrito.service';
import { AuthService } from '../../core/services/auth.service';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Butaca {
  id: string;
  fila: string;
  numero: number;
  tipo: 'normal' | 'discapacidad' | 'vip';
  estado: 'libre' | 'ocupada' | 'seleccionada';
  precio: number;
}

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './seat-selection.html',
  styleUrl: './seat-selection.css'
})
export class SeatSelectionComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private supabase = inject(SupabaseService).client;
  private carritoService = inject(CarritoService);
  private authService = inject(AuthService);

  funcionId = signal<string>('');
  funcion = signal<any>(null);
  cargando = signal(true);

  precioBase = signal<number>(4000);
  sala = signal<Butaca[][]>([]);
  asientosSeleccionados = signal<Butaca[]>([]);

  private canalRealtime: RealtimeChannel | null = null;

  asientosIdsTexto = computed(() => {
    return this.asientosSeleccionados().map(b => b.id).join(', ');
  });

  totalEntradas = computed(() => {
    return this.asientosSeleccionados().reduce((acc, b) => acc + b.precio, 0);
  });

  async ngOnInit() {
    const fId = this.route.snapshot.paramMap.get('id') || this.route.snapshot.paramMap.get('funcionId');
    if (fId) {
      this.funcionId.set(fId);
      await this.cargarFuncionYAsientos(fId);
      this.suscribirAButacasEnTiempoReal(fId);
    }
  }

  ngOnDestroy() {
    if (this.canalRealtime) {
      this.supabase.removeChannel(this.canalRealtime);
    }
  }

  suscribirAButacasEnTiempoReal(fId: string) {
    this.canalRealtime = this.supabase
      .channel(`reservas-funcion-${fId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservas', filter: `funcion_id=eq.${fId}` },
        () => {
          this.recargarOcupacion(fId);
        }
      )
      .subscribe();
  }

  async recargarOcupacion(fId: string) {
    const user = this.authService.currentUser();
    const { data: reservas } = await this.supabase
      .from('reservas')
      .select('asientos, estado, usuario_id')
      .eq('funcion_id', fId)
      .neq('estado', 'cancelada');

    const ocupados = new Set<string>();
    if (reservas) {
      reservas.forEach(r => {
        if (r.usuario_id !== user?.id && Array.isArray(r.asientos)) {
          r.asientos.forEach((a: string) => ocupados.add(a));
        }
      });
    }

    this.sala.update(matriz =>
      matriz.map(fila =>
        fila.map(b => {
          if (this.asientosSeleccionados().some(s => s.id === b.id)) {
            return { ...b, estado: 'seleccionada' };
          }
          return {
            ...b,
            estado: ocupados.has(b.id) ? 'ocupada' : 'libre'
          };
        })
      )
    );
  }

  async cargarFuncionYAsientos(fId: string) {
    const { data: funcionData } = await this.supabase
      .from('funciones')
      .select('*, peliculas(*)')
      .eq('id', fId)
      .single();

    if (funcionData) {
      this.funcion.set(funcionData);
      this.precioBase.set(Number(funcionData.precio) || 4000);
    }

    await this.recargarOcupacion(fId);
    this.sala.set(this.generarSala(new Set()));
    await this.recargarOcupacion(fId);
    this.cargando.set(false);
  }

  generarSala(ocupados: Set<string>): Butaca[][] {
    const filas = ['A','B','C','D','E','F','G','H','I','J-K','L','M','N','O','P','Q','R','S','T'];
    const distribucionNormal = [4, 20, 4];
    const distribucionDiscapacidad = [2, 10, 2]; 
    const base = this.precioBase();

    let matriz: Butaca[][] = [];

    filas.forEach(letra => {
      let filaActual: Butaca[] = [];
      let numAsiento = 1;
      const esAccesible = letra === 'J-K';
      const esVip = ['R', 'S', 'T'].includes(letra); 

      const tipo: 'normal' | 'discapacidad' | 'vip' = esAccesible ? 'discapacidad' : esVip ? 'vip' : 'normal';
      const distribucion = esAccesible ? distribucionDiscapacidad : distribucionNormal;
      const precioAsiento = esVip ? Math.round(base * 1.35) : base;

      distribucion.forEach(cantidad => {
        for (let i = 0; i < cantidad; i++) {
          const asientoId = `${letra}-${numAsiento}`;
          filaActual.push({
            id: asientoId,
            fila: letra,
            numero: numAsiento,
            tipo: tipo,
            precio: precioAsiento,
            estado: ocupados.has(asientoId) ? 'ocupada' : 'libre'
          });
          numAsiento++;
        }
      });

      matriz.push(filaActual);
    });

    return matriz;
  }

  async seleccionarButaca(butaca: Butaca) {
    if (butaca.estado === 'ocupada') return;

    const user = this.authService.currentUser();
    const funcionId = this.funcionId();

    if (butaca.estado === 'seleccionada') {
      butaca.estado = 'libre';
      this.asientosSeleccionados.update(list => list.filter(b => b.id !== butaca.id));

      await this.supabase
        .from('reservas')
        .delete()
        .eq('funcion_id', funcionId)
        .eq('estado', 'bloqueada')
        .contains('asientos', [butaca.id]);

    } else {
      butaca.estado = 'seleccionada';
      this.asientosSeleccionados.update(list => [...list, butaca]);

      const codigoTemporal = `TEMP-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      await this.supabase
        .from('reservas')
        .insert([
          {
            funcion_id: funcionId,
            usuario_id: user?.id || null,
            asientos: [butaca.id],
            total_pagar: butaca.precio,
            qr_codigo: codigoTemporal,
            estado: 'bloqueada'
          }
        ]);
    }
  }

  continuarACandyBar() {
    if (this.asientosSeleccionados().length === 0) {
      alert('Debes seleccionar al menos una butaca.');
      return;
    }

    this.asientosSeleccionados().forEach(b => {
      this.carritoService.agregarItem({
        tipo: 'entrada',
        id: `${this.funcionId()}_${b.id}`,
        nombre: `Entrada Butaca ${b.id} (${b.tipo.toUpperCase()})`,
        precio: b.precio,
        cantidad: 1
      });
    });

    sessionStorage.setItem('reserva_activa', JSON.stringify({
      funcion_id: this.funcionId(),
      pelicula: this.funcion()?.peliculas,
      asientos: this.asientosSeleccionados().map(b => b.id),
      total_entradas: this.totalEntradas(),
      sala: this.funcion()?.sala,
      fecha_hora: this.funcion()?.fecha_hora
    }));

    this.router.navigate(['/candybar']);
  }
}