import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { Asiento } from '../../core/models/asiento.interface';

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './seat-selection.html',
  styleUrl: './seat-selection.css'
})
export class SeatSelectionComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  funcionId = signal<string | null>(null);
  asientos = signal<Asiento[]>([]);
  asientosSeleccionados = signal<Asiento[]>([]);

  totalPagar = computed(() => {
    return this.asientosSeleccionados().reduce((total, asiento) => total + asiento.precio, 0);
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('funcionId');
    this.funcionId.set(id);
    this.cargarAsientos();
  }

  cargarAsientos(): void {
    // Aquí cargarías los asientos desde un servicio usando el funcionId()
  }

  seleccionarAsiento(asiento: Asiento): void {
    if (asiento.estado !== 'disponible') return;

    this.asientosSeleccionados.update(seleccionados => {
      const yaSeleccionado = seleccionados.some(a => a.id === asiento.id);
      if (yaSeleccionado) {
        return seleccionados.filter(a => a.id !== asiento.id);
      } else {
        return [...seleccionados, asiento];
      }
    });
  }
}
