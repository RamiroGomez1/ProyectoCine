// Path: src/app/core/services/auth.service.ts
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
    this.initAuth();
  }

  private initAuth() {
    // Obtener sesion
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentSession.set(session);
      this.currentUser.set(session?.user ?? null);
      
  
      if (session?.user) {
        this.cargarDatosUsuario(session.user.id);
      }
    });

    // Escuchar cambios de estado (login, logout)
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


  private async cargarDatosUsuario(userId: string) {
    const { data, error } = await this.supabase
      .from('usuarios') 
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error al cargar datos del usuario:', error.message);
    } else if (data) {
      this.currentUserData.set(data as Usuario);
    }
  }

  async signIn(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async signUp(email: string, password: string, nombre: string, apellido: string) {
    return await this.supabase.auth.signUp({ 
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

  async signOut() {
    return await this.supabase.auth.signOut();
  }
}