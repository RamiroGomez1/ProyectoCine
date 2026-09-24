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
  clasificacionEdad: number;
  precioBase: number;
  esPreventa?: boolean;
}