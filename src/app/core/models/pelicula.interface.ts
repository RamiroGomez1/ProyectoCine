// Estructura de cada película

export interface Pelicula {
    id: string;
    titulo: string;
    sinopsis: string;
    duracionMinutos: number;
    portadaUrl: string;
    generos: string[];
    formato: '2D' | '3D' | '4D' | '5D';
    idioma: 'Castellano' | 'Subtitulada';
    clasificacionMinimoEdad: 0 | 13 | 18;
    precioBase: number;
    esPreventa: boolean;
}