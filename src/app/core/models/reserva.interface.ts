// Estructura de cada reserva

export interface Reserva {
    id: string;
    funcionId: string;
    usuarioId?: string;
    asientos: string[];
    totalPagar: number;
    qrCodigo: string;
    estado: 'pendiente' | 'confirmada' | 'cancelada' | 'usada';
    fechaCompra: string;
}