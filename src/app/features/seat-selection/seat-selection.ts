import { Component, signal, computed } from '@angular/core';

export interface Butaca {
  id: string;
  fila: string;
  numero: number;
  tipo: 'normal' | 'discapacidad' | 'vip';
  estado: 'libre' | 'ocupada' | 'seleccionada';
}

@Component({
  selector: 'app-seat-selection',
  standalone: true,
  templateUrl: './seat-selection.html',
  styleUrl: './seat-selection.css'
})
export class SeatSelectionComponent {
  //matriz de butacas
  sala = signal<Butaca[][]>(this.generarSala());

  generarSala(): Butaca[][] {
    const filas = ['A','B','C','D','E','F','G','H','I','J-K','L','M','N','O','P','Q','R','S','T'];
    const distribucionNormal = [4, 20, 4]; 
    const distribucionDiscapacidad = [2, 10, 2]; // Columnas para fila adaptada
    
    let matriz: Butaca[][] = [];

    filas.forEach(letra => {
      let filaActual: Butaca[] = [];
      let numAsiento = 1;
      
      // Determinar el tipo de butaca según la letra
      let tipo: 'normal' | 'discapacidad' | 'vip' = 'normal';
      let distribucion = distribucionNormal;

      if (letra === 'J-K') {
        tipo = 'discapacidad';
        distribucion = distribucionDiscapacidad; // Fila para personas con discapacidad
      } else if (['R', 'S', 'T'].includes(letra)) {
        tipo = 'vip'; // ultimas 3 filas VIP
      }

      // Generar los bloques de asientos
      distribucion.forEach(cantidad => {
        for (let i = 0; i < cantidad; i++) {
          filaActual.push({
            id: `${letra}-${numAsiento}`,
            fila: letra,
            numero: numAsiento,
            tipo: tipo,
            estado: 'libre' 
          });
          numAsiento++;
        }
      });

      matriz.push(filaActual);
    });

    return matriz;
  }

  seleccionarButaca(butaca: Butaca) {
    // logica para cambiar el estado de la butaca a seleccionada
    // integrar Supabase Realtime para bloquearla en tiempo real
  }
}