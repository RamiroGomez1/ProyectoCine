export interface Combo {
  id: number;
  nombre: string;
  descripcion: string;
  precio_fijo: number;
  productos_incluidos: number[]; // IDs de los productos
}

export async function crearCombo(this: any, nombre: string, descripcion: string, precio_fijo: number, productos_ids: number[]): Promise<Combo> {
    const { data, error } = await this.supabase
    .from("combos")
    .insert({ 
        nombre,
        descripcion,
        precio_fijo, // Precio fijo configurable por el admin[cite: 7]
        productos_incluidos: productos_ids
    })
    .select()
    .single();

    if (error) {
        throw error;
    }

    return data as Combo;
}

