export interface Asiento {
    id: string;
    fila: string;
    numero: number;
    estado: 'disponible' | 'ocupado' | 'seleccionado';
    precio: number;
}