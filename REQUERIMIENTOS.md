# Requerimientos - Sistema de venta de entradas del cine

Resumen de todo lo que pidió el cliente en los mails.

## Cartelera y películas
- Cada película tiene nombre, sinopsis, duración, imagen y uno o varios géneros.
- El admin elige qué películas se muestran en la página.
- Cada función tiene horario, formato (2D, 3D, 4D o 5D) e idioma (castellano o subtitulada).
- En el inicio se muestran primero las 3 películas más vendidas.
- El listado tiene un buscador que también filtra por género.
- Restricción de edad: +13, +18 o ATP. Los menores no pueden comprar esas entradas y la entrada tiene que aclarar que debe ir con un adulto.

## Salas y funciones
- Un solo edificio con varias salas, todas con la misma forma: 20 filas (A a T) y 3 columnas de 4, 20 y 4 butacas.
- Las filas J y K se reemplazan por una fila para personas con discapacidad con 2, 10 y 2 butacas, resaltada distinto.
- Las filas R, S y T son VIP: más caras, marcadas distinto y el usuario tiene que saber que compra una VIP antes de pagar.
- No puede haber una función hasta media hora después de que termina la anterior en la misma sala.
- La sala se asigna sola. El admin elige días de la semana y hora (ej: lunes, martes y viernes a las 18hs) y el sistema busca una sala libre.
- Las butacas se ven en tiempo real (las que otro está comprando aparecen ocupadas).
- Ingreso de fechas y horas fácil, sin tanto scroll.

## Usuarios
- Registro con mail, nombre, apellido, fecha de nacimiento, tipo de sangre, color de ojos y días de vacaciones por año.
- Se puede comprar sin registrarse.
- Roles: cliente, empleado (valida QRs) y admin (controla salas, funciones, productos, etc).

## Compra
- Al comprar se genera un PDF con los datos de la entrada y un QR.
- Se pueden sumar productos del candy bar (con categorías) y se retiran con el mismo QR.
- Combos especiales (entrada + pochoclo + bebida) a precio fijo, destacados en la compra.
- Cupón de 20% en la primera compra para registrados, con porcentaje configurable.
- Cupones solo para mayores de 50 años.
- Se puede cancelar hasta 2 horas antes de la función. No se devuelve plata, queda como crédito en la cuenta que se puede usar junto con otro método de pago.

## Fidelización
- 1 punto por cada peso gastado (solo registrados).
- Los puntos se canjean por entradas gratis o productos del candy. El admin configura cuántos puntos cuesta cada cosa.
- En el perfil se ven los puntos y el historial de canjes. No se pueden transferir.

## Reseñas
- Cada persona califica con estrellas y deja un comentario corto.
- Se ven antes de comprar, junto con el promedio.
- Sección "Mis películas" con el historial de lo que vio: póster, fecha y su calificación.

## Próximamente y preventa
- Sección de próximos estrenos con alerta para avisar cuando salen a la venta.
- Preventa configurable por película: abre 7 días antes del estreno con precio especial y después vuelve al precio normal.

## Empleados
- Escanean el QR para la sala y para el candy bar por separado.
- Se puede escribir el código a mano si el lector no anda.
- Una vez validada la entrada o entregada la comida, el QR ya no sirve para eso.

## Administración
- Reporte de facturación por día y entradas vendidas, exportable a PDF y Excel.
- Gráfico de películas más vistas por semana y por mes, y producto del candy más vendido.
- Log de actividad: quién creó qué función, quién cambió un precio, quién validó un QR, con fecha y hora.

## Queda afuera
- Mapa del cine con la sala de la entrada: el cliente dijo que todavía no tiene luz verde.
