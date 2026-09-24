import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Señales para manejar el estado de la vista
  cargando = signal(false);
  mensajeError = signal<string | null>(null);

  // Definición del formulario reactivo
  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  async login() {
    if (this.loginForm.invalid) return;

    this.cargando.set(true);
    this.mensajeError.set(null);

    const { email, password } = this.loginForm.getRawValue();

    try {
      const { data, error } = await this.authService.signIn(email, password);

      if (error) {
        this.mensajeError.set('Correo o contraseña incorrectos.');
      } else {
        this.router.navigate(['/']); 
      }
    } catch (err) {
      this.mensajeError.set('Ocurrió un error inesperado al iniciar sesión.');
    } finally {
      this.cargando.set(false);
    }
  }
}