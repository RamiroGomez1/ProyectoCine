import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface Cupon {
  id?: string;
  codigo: string;
  porcentaje: number;
  tipo: 'primera_compra' | 'mayores_50';
}

@Injectable({ providedIn: 'root' })
export class CuponesService {
  private auth = inject(AuthService);
  private supabase = inject(SupabaseService).client;

  async validarCupon(codigo: string): Promise<{ valido: boolean, porcentaje: number, mensaje: string }> {
    const usuario = this.auth.currentUserData();

    const { data: cupon } = await this.supabase
      .from('cupones')
      .select('*')
      .eq('codigo', codigo.trim().toUpperCase())
      .maybeSingle();

    if (!cupon) {
      return { valido: false, porcentaje: 0, mensaje: 'Cupón inválido o expirado.' };
    }

    if (!usuario) {
      return { valido: false, porcentaje: 0, mensaje: 'Debes registrarte para usar este cupón.' };
    }

    const porcentaje = Number(cupon.porcentaje);

    if (cupon.tipo === 'primera_compra') {
      // solo vale si nunca compro nada
      const { count } = await this.supabase
        .from('reservas')
        .select('id', { count: 'exact', head: true })
        .eq('usuario_id', usuario.id)
        .in('estado', ['confirmada', 'usada', 'cancelada']);

      if ((count || 0) > 0) {
        return { valido: false, porcentaje: 0, mensaje: 'Este cupón es solo para tu primera compra.' };
      }
      return { valido: true, porcentaje, mensaje: `¡${cupon.porcentaje}% de descuento aplicado en tu primera compra!` };
    }

    if (!usuario.fechaNacimiento) {
      return { valido: false, porcentaje: 0, mensaje: 'Tenés que cargar tu fecha de nacimiento en el perfil.' };
    }

    const edad = this.calcularEdad(usuario.fechaNacimiento);
    if (edad <= 50) {
      return { valido: false, porcentaje: 0, mensaje: 'Este cupón es exclusivo para mayores de 50 años.' };
    }

    return { valido: true, porcentaje, mensaje: `¡Cupón ${cupon.codigo} aplicado con éxito!` };
  }

  async obtenerCupones(): Promise<Cupon[]> {
    const { data, error } = await this.supabase
      .from('cupones')
      .select('*')
      .order('tipo', { ascending: false });

    if (error) {
      console.error('Error al obtener cupones:', error.message);
      return [];
    }
    return data || [];
  }

  async crearCupon(cupon: Cupon): Promise<{ exito: boolean; mensaje?: string }> {
    const { error } = await this.supabase
      .from('cupones')
      .insert([{ ...cupon, codigo: cupon.codigo.trim().toUpperCase() }]);

    if (error) return { exito: false, mensaje: error.message };
    return { exito: true };
  }

  async actualizarPorcentaje(id: string, porcentaje: number): Promise<{ exito: boolean; mensaje?: string }> {
    const { error } = await this.supabase
      .from('cupones')
      .update({ porcentaje })
      .eq('id', id);

    if (error) return { exito: false, mensaje: error.message };
    return { exito: true };
  }

  async eliminarCupon(id: string): Promise<{ exito: boolean; mensaje?: string }> {
    const { error } = await this.supabase
      .from('cupones')
      .delete()
      .eq('id', id);

    if (error) return { exito: false, mensaje: error.message };
    return { exito: true };
  }

  // calcular la edad exacta
  calcularEdad(fechaNacimiento: string): number {
    const hoy = new Date();
    const cumple = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const mes = hoy.getMonth() - cumple.getMonth();

    if (mes < 0 || (mes === 0 && hoy.getDate() < cumple.getDate())) {
      edad--;
    }
    return edad;
  }
}
