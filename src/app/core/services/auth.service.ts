import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User, Session } from '@supabase/supabase-js';
import { Usuario } from '../models/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService).client;

  currentUser = signal<User | null>(null);
  currentSession = signal<Session | null>(null);
  currentUserData = signal<Usuario | null>(null);
  constructor() {
    this.initAuthSession();
  }

  private sesionCargada: Promise<void> | null = null;

  private initAuthSession() {
    this.sesionCargada = this.supabase.auth.getSession().then(async ({ data: { session } }) => {
      this.currentSession.set(session);
      this.currentUser.set(session?.user ?? null);
      if (session?.user) {
        await this.cargarDatosUsuario(session.user.id);
      }
    });

    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.currentSession.set(session);
      this.currentUser.set(session?.user ?? null);
      if (session?.user) {
        this.cargarDatosUsuario(session.user.id);
      } else {
        this.currentUserData.set(null);
      }
    });
  }

  // los guards esperan a que termine de cargar la sesion (si no al recargar la pagina te saca)
  async esperarSesion() {
    await this.sesionCargada;
  }

  async cargarDatosUsuario(userId: string) {
    const { data, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error al cargar datos del usuario:', error.message);
    } else if (data) {
      const usuarioMapeado: Usuario = {
        id: data.id,
        email: data.email || '',
        nombre: data.nombre || '',
        apellido: data.apellido || '',
        fechaNacimiento: data.fecha_nacimiento || data.fechaNacimiento || '',
        tipoSangre: data.tipo_sangre || data.tipoSangre || '',
        colorOjos: data.color_ojos || data.colorOjos || '',
        diasVacaciones: Number(data.dias_vacaciones ?? data.diasVacaciones ?? 0),
        puntosFidelidad: Number(data.puntos_fidelidad ?? data.puntosFidelidad ?? 0),
        saldoFavor: Number(data.saldo_favor ?? data.saldoFavor ?? 0),
        rol: data.rol || 'cliente'
      };
      this.currentUserData.set(usuarioMapeado);
    }
  }
  async signUp(email: string, password: string, nombre: string, apellido: string) {
    return this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nombre: nombre,
          apellido: apellido
        }
      }
    });
  }

  // supabase devuelve los errores de login/registro en ingles
  traducirError(mensaje: string): string {
    if (mensaje.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
    if (mensaje.includes('Email not confirmed')) return 'Tenés que confirmar tu email antes de iniciar sesión.';
    if (mensaje.includes('already registered')) return 'Ya existe una cuenta con ese email.';
    if (mensaje.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.';
    if (mensaje.includes('rate limit') || mensaje.includes('security purposes')) return 'Demasiados intentos, esperá unos minutos.';
    if (mensaje.includes('invalid')) return 'El email no es válido.';
    return 'Ocurrió un error, intentá de nuevo.';
  }

  async signIn(email: string, password: string) {
    const response = await this.supabase.auth.signInWithPassword({ email, password });
    if (response.data.session?.user) {
      this.currentSession.set(response.data.session);
      this.currentUser.set(response.data.session.user);
      await this.cargarDatosUsuario(response.data.session.user.id);
    }
    return response;
  }

  async signOut() {
    const res = await this.supabase.auth.signOut();
    this.currentUser.set(null);
    this.currentSession.set(null);
    this.currentUserData.set(null);
    return res;
  }
}