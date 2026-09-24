// Estructura de cada usuario

export interface Usuario {
    id: string;
    email: string;
    nombre: string;
    apellido: string;
    fechaNacimiento: string;

    tipoSangre: string;
    colorOjos: string;
    diasVacaciones: number;

    puntosFidelidad: number;
    saldoFavor: number;
    rol:'cliente' | 'empleado' | 'administrador'
}