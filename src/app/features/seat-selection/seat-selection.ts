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

  peliculaId = signal<string | null>(null);
  funcionId = signal<string | null>(null);

  asientos = signal<Asiento[]>([]);

  asientosSeleccionados = signal<Asiento[]>([]);

  precioTotal = computed(() => {
    const PRECIO_ENTRADA = 5000; 
    return this.asientosSeleccionados().length * PRECIO_ENTRADA;
  });

  ngOnInit() {
    this.funcionId.set(this.route.snapshot.paramMap.get('funcionId'));
    this.peliculaId.set(this.route.snapshot.paramMap.get('peliculaId'));
  }

  toggleAsiento(asiento: Asiento) {
    if (asiento.estado === 'ocupado') return;

    const seleccionActual = this.asientosSeleccionados();
    const yaSeleccionado = seleccionActual.find(a => a.id === asiento.id);

    if (yaSeleccionado) {
      this.asientosSeleccionados.set(seleccionActual.filter(a => a.id !== asiento.id));
    } else {
      if (seleccionActual.length >= 6) {
        alert('Podés seleccionar hasta 6 butacas por compra.');
        return;
      }
      this.asientosSeleccionados.set([...seleccionActual, asiento]);
    }
  }

  continuar() {
    if (this.asientosSeleccionados().length === 0) {
      alert('Por favor, seleccioná al menos un asiento.');
      return;
    }
    
    this.router.navigate(['/candybar', this.funcionId()]);
  }
}