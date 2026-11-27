# ProyectoCine

TP 1 de Programación IV. Sistema para que un cine venda entradas online, con candy bar, fidelización y panel de administración.

Los requerimientos resumidos están en [REQUERIMIENTOS.md](REQUERIMIENTOS.md).

## Tecnologías
- Angular 22 (componentes standalone, signals, control flow `@if` / `@for`)
- Supabase: base de datos, autenticación, storage (portadas) y realtime (butacas)
- PWA con `@angular/service-worker`
- jsPDF y qrcode para el ticket y el reporte
- Deploy en Vercel

## Cómo correrlo
```bash
npm install
npm start
```
Para la base de datos hay que correr una vez el script [supabase/tablas.sql](supabase/tablas.sql) en el SQL Editor de Supabase (agrega las columnas y tablas nuevas).

## Arquitectura
```
src/app
├── core
│   ├── guards      -> auth, admin y empleado
│   ├── models      -> interfaces
│   └── services    -> toda la comunicación con Supabase
├── features        -> una carpeta por pantalla (lazy loading)
├── layout          -> header y footer
└── shared          -> componentes reutilizables
```
- Los componentes no tienen lógica de negocio pesada, la mayoría está en los servicios (`cine.service` asigna salas, `cupones.service` valida cupones, `reportes.service` arma los reportes, etc).
- El estado se maneja con signals y `computed` (por ejemplo el carrito y los totales del resumen).
- Todas las rutas usan `loadComponent` para que se carguen cuando se necesitan.
- Los guards esperan a que Supabase cargue la sesión antes de decidir, así al recargar la página no te saca.

### Tablas
| Tabla | Para qué |
|---|---|
| peliculas | datos de la película, precio, estreno, preventa y si está visible |
| funciones | película, sala, fecha y hora, formato, idioma y precio |
| salas | salas del cine (todas con la misma distribución) |
| reservas | compras: butacas, productos del candy, total, QR y estado |
| usuarios | datos del registro, rol, puntos y saldo a favor |
| cupones | cupón de primera compra y cupones para mayores de 50 |
| configuracion | puntos que cuesta una entrada gratis |
| canjes | historial de canjes de puntos |
| resenas | estrellas y comentario |
| alertas_estrenos | alertas de "Próximamente" |
| productos_candy | productos y combos |
| logs_auditoria | log de actividad del admin y empleados |

## Decisiones técnicas
- **Asignación de salas:** el admin elige película, días de la semana, hora y rango de fechas. Para cada fecha se busca la primera sala que no tenga otra función que termine menos de 30 minutos antes o empiece menos de 30 minutos después. Si ninguna sala está libre se avisa cuál fecha no se pudo programar.
- **Butacas en tiempo real:** cuando alguien elige una butaca se guarda una reserva con estado `bloqueada` y todos los que están mirando esa función la ven ocupada por el canal de realtime. Si pasan 15 minutos sin terminar la compra el bloqueo deja de contar.
- **Sala:** se arma con un array de filas. La fila J-K es la accesible (2, 10 y 2 butacas) y R, S y T son VIP con un 35% más de precio.
- **Mismo QR para sala y candy:** la reserva tiene `estado` (para la entrada) y `candy_entregado` (para la comida). El empleado elige qué está validando y cada parte se puede usar una sola vez.
- **Lector de QR:** el empleado escanea con la cámara del celular usando `BarcodeDetector`, que ya viene en el navegador (Chrome en Android), así no hace falta otra librería. Si la cámara o el navegador no andan, el código se escribe a mano en el input (que también sirve para un lector USB, que escribe el código y manda Enter).
- **Combos:** un combo incluye una entrada, así que por cada combo una de las entradas queda en $0. No se pueden llevar más combos que entradas.
- **Puntos:** 1 punto por peso pagado. En el resumen cada entrada o producto se puede pagar con puntos si te alcanzan; cada canje queda en la tabla `canjes`.
- **Preventa:** si la película tiene preventa la venta abre 7 días antes del estreno con el precio de preventa. Desde el día del estreno se cobra el precio normal de la función.
- **Alertas de estreno:** cuando el usuario entra al inicio se revisan sus alertas; si la venta ya abrió se muestra el aviso (y una notificación del navegador si dio permiso) y la alerta se desactiva.
- **Excel:** el reporte se exporta en CSV separado por `;`, que Excel abre directo sin instalar otra librería.
- **Fechas:** se usan inputs nativos `date` y `time` en vez de listas largas, para no tener que scrollear.
