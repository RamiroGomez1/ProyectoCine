import { Component, OnInit, signal, inject } from '@angular/core';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { Pelicula } from '../../core/models/pelicula.interface';
import { Funcion } from '../../core/models/funcion.interface';

@Component({
    selector: 'app-movie-detail', standalone: true,
    imports: [RouterLink, DatePipe],
    templateUrl: './movie-detail.html',
    styleUrl: './movie-detail.css'
})

export class MovieDetailComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private router = inject(Router);

    pelicula = signal<Pelicula | null>(null);
    funciones = signal<Funcion[]>([]);
    funcionSeleccionada = signal<Funcion | null>(null);

    private peliculasMock: Pelicula[] = [{
        id: '1',
        titulo: 'Dune: Parte Dos',
        sinopsis: 'Paul Atreides se une a Chani y a los Fremen mientras busca venganza contra los conspiradores que destruyeron a su familia. Ante una elección entre el amor de su vida y el destino del universo, debe evitar un futuro terrible.', 
        duracionMinutos: 166, 
        portadaUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&amp;w=600',
        generos: ['Sci-Fi', 'Aventura'], 
        formato: '4D', 
        idioma: 'Subtitulada', 
        esPreventa: false, 
        clasificacionMinimoEdad: 13,
        precioBase: 4500
    }
        ,
    {
        id: '2',
        titulo: 'Kung Fu Panda 4',
        sinopsis: 'Po debe entrenar a un nuevo guerrero mientras enfrenta a una peligrosa hechicera llamada La Camaleona, quien busca invocar a todos los villanos del pasado.',
        duracionMinutos: 94,
        portadaUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&amp;w=600',
        generos: ['Animación', 'Aventura'], formato: '3D', idioma: 'Castellano',
        esPreventa: false,
        clasificacionMinimoEdad: 0, 
        precioBase: 3800
    },
    {
        id: '3', titulo: 'Gladiador II', sinopsis: 'Años después de presenciar la muerte de Maximus, Lucius debe entrar al Coliseo tras ser forzado a luchar para devolverle la gloria a Roma.', duracionMinutos: 148, portadaUrl: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&amp;w=600',
        generos: ['Acción', 'Drama'],
        formato: '2D',
        idioma: 'Subtitulada',
        clasificacionMinimoEdad: 18,
        precioBase: 4200,
        esPreventa: true
    }
    ];

    ngOnInit(): void {
        const idParam = this.route.snapshot.paramMap.get('id')
        if(idParam){
            const encontrada = this.peliculasMock.find(p => p.id === idParam)
            if(encontrada){
                this.pelicula.set(encontrada);
                this.cargarFuncionesMock(encontrada.id, encontrada.precioBase)
            }
        }
    }

    private cargarFuncionesMock(peliculaId: string, precioBase: number): void {
        const hoy = new Date();

        this.funciones.set([ 
            { 
            id: 'f1', 
            peliculaId, 
            sala: 'Sala 1 (4D)',
            fechaHoraInicio: new Date(hoy.setHours(16, 30, 0, 0)), 
            precioEntrada: precioBase + 1000, 
            formato: '4D', 
            idioma: 'Subtitulada' 
            }
            , 
            { 
                id: 'f2', peliculaId, 
                sala: 'Sala 3 (3D)', 
                fechaHoraInicio: new Date(hoy.setHours(19, 15, 0, 0)), 
                precioEntrada: precioBase + 500, 
                formato: '3D', 
                idioma: 'Castellano' }
            , 
            { 
                id: 'f3', peliculaId, 
                sala: 'Sala 2 (MacroXE)', 
                fechaHoraInicio: new Date(hoy.setHours(22, 0, 0, 0)), 
                precioEntrada: precioBase, 
                formato: '2D', 
                idioma: 'Subtitulada' } 
            ])
    }

    seleccionarFuncion(funcion: Funcion): void {
        this.funcionSeleccionada.set(funcion)
    }

    continuarASeleccionDeAsientos(): void {
        const funcion = this.funcionSeleccionada();
        if(funcion){
            this.router.navigate(['/reserva', funcion.id])
        }
    }
}