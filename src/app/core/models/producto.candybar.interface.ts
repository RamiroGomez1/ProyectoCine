export interface ProductoCandyBar{
    id:string;
    nombre:string;
    descripcion:string;
    precio:number;
    imagenUrl:string;
    categoria:'Combos'|'Pochoclos'|'Bebidas'|'Golosinas';
    cantidadSeleccionada?: number;
    esCombo: boolean;
    costoEnPuntos?: number;
}