import { Component } from '@angular/core'; 
import { RouterOutlet } from '@angular/router'; 
import { HeaderComponent } from './layout/header/header'; 
import { FooterComponent } from './layout/footer/footer';
import { ModalComponent } from './shared/modal/modal';

@Component({ 
    selector: 'app-root', 
    standalone: true, 
    imports: [RouterOutlet, HeaderComponent, FooterComponent, ModalComponent],
    templateUrl: './app.component.html', 
    styleUrl: './app.component.css' 
}) 
     
    export class AppComponent { title = 'Cine'; }