import { Injectable } from '@angular/core';
// @ts-ignore The dependency is provided by the application's package setup.
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})

export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.publicKey
    );
  }

  get client(): SupabaseClient {
    return this.supabase;
  }
}
