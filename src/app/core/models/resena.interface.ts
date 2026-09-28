export interface Resena {
  id?: string;
  pelicula_id: string;
  user_id: string;
  puntuacion: number; 
  comentario: string;
  created_at?: string;
  usuarios?: {
    nombre: string;
    apellido: string;
  };
}