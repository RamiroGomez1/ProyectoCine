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

  private initAuthSession() {
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentSession.set(session);
      this.currentUser.set(session?.user ?? null);
      if (session?.user) {
        this.cargarDatosUsuario(session.user.id);
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