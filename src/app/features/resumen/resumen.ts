import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-resumen',
  standalone: true,
  imports: [RouterLink, FormsModule, DatePipe, CurrencyPipe],
  templateUrl: './resumen.html',
  styleUrl: './resumen.css'
})
export class ResumenComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  funcionId = signal<string | null>(null);
  emailCliente = signal<string>('');
  nombreCliente = signal<string>('');
  
  reservaConfirmada = signal<boolean>(false);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('funcionId');
    this.funcionId.set(id);
    this.cargarResumenReserva();
  }

  cargarResumenReserva(): void {
    // Recupera la información guardada del estado actual del flujo (butacas y candybar)
  }

  procesarPago(): void {
    if (!this.emailCliente() || !this.nombreCliente()) return;
    this.reservaConfirmada.set(true);
  }
}
