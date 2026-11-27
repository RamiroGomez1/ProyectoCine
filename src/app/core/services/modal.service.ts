import { Injectable, signal } from '@angular/core';

export interface DatosModal {
  mensaje: string;
  tipo: 'aviso' | 'confirmar';
}

// Reemplaza los alert() y confirm() del navegador por un modal propio
@Injectable({ providedIn: 'root' })
export class ModalService {
  modal = signal<DatosModal | null>(null);
  private resolver: ((valor: boolean) => void) | null = null;

  avisar(mensaje: string): Promise<boolean> {
    return this.abrir({ mensaje, tipo: 'aviso' });
  }

  confirmar(mensaje: string): Promise<boolean> {
    return this.abrir({ mensaje, tipo: 'confirmar' });
  }

  cerrar(respuesta: boolean) {
    this.modal.set(null);
    this.resolver?.(respuesta);
    this.resolver = null;
  }

  private abrir(datos: DatosModal): Promise<boolean> {
    this.modal.set(datos);
    return new Promise(resolve => this.resolver = resolve);
  }
}
