import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

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
  private router = inject(Router);

  // Señal para manejar el estado de la vista
  cargando = signal(false);
  mensajeError = signal<string | null>(null);

  registerForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async registrar() {
    // Si el formulario es inválido, no hacemos nada
    if (this.registerForm.invalid) return;

    this.cargando.set(true);
    this.mensajeError.set(null);

    const { email, password } = this.registerForm.getRawValue();

    try {
      const { data, error } = await this.authService.signUp(email, password);

      if (error) {
        this.mensajeError.set(error.message);
      } else {
        // Si el registro es exitoso, redirigir al usuario (ej. inicio o login)
        // Nota: Supabase puede requerir confirmación por email dependiendo de tu configuración
        this.router.navigate(['/']); 
      }
    } catch (err) {
      this.mensajeError.set('Ocurrió un error inesperado durante el registro.');
    } finally {
      this.cargando.set(false);
    }
  }
}