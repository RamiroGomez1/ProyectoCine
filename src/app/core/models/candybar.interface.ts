// Estructura de cada producto del candybar

export interface ProductoCandyBar {
    id: string;
    nombre: string;
    descripcion: string;
    categoria: 'pochoclos' | 'bebidas' | 'golosinas' | 'combos';
    precio: number;
    imagenUrl: string;
    esCombo: boolean;
    costoEnPuntos?: number;
}