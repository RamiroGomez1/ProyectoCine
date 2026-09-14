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
    salfoFavor: number;
    rol:'cliente' | 'empleado' | 'administrador'
}