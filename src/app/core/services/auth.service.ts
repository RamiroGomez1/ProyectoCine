import { Injectable, signal, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { User, Session } from '@supabase/supabase-js';
//import { Usuario } from '../models/usuario.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase = inject(SupabaseService).client;
  
  // Señales reactivas para el usuario y la sesión
  currentUser = signal<User | null>(null);
  session = signal<Session | null>(null);

  constructor() {
    this.initAuth();
  }

  private async initAuth() {
    // Obtener la sesión actual al cargar
    const { data } = await this.supabase.auth.getSession();
    this.session.set(data.session);
    this.currentUser.set(data.session?.user ?? null);

    // Escuchar cambios de estado (login, logout, token refresh)
    this.supabase.auth.onAuthStateChange((_event, session) => {
      this.session.set(session);
      this.currentUser.set(session?.user ?? null);
    });
  }

  // Métodos de autenticación básicos
  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string) {
    return await this.supabase.auth.signUp({ email, password });
  }

  async signOut() {
    return await this.supabase.auth.signOut();
  }
}