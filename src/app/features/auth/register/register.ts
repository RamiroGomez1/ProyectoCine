import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SupabaseService } from '../../../core/services/supabase.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);

  registerForm = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    apellido: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  async onSubmit() {
    if (this.registerForm.invalid) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const { nombre, apellido, email, password } = this.registerForm.value;

    try {
      const { data, error } = await this.authService.signUp(email!, password!, nombre!, apellido!);
      if (error) throw error;

      if (data.user) {
        const { error: insertError } = await this.supabaseService.client
          .from('usuarios')
          .insert([
            {
              id: data.user.id, 
              nombre: nombre!,
              apellido: apellido!,
              rol: 'user' 
            }
          ]);

        if (insertError) {
          console.error('Error al guardar en la tabla usuarios:', insertError.message);
        }
      }

      this.successMessage.set('¡Registro exitoso! Ya podés iniciar sesión.');
      this.registerForm.reset();
      
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);

    } catch (error: any) {
      this.errorMessage.set(error.message || 'Error al registrarse');
    } finally {
      this.isLoading.set(false);
    }
  }
}