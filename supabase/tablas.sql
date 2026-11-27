-- Cambios en la base de datos de Supabase para el TP
-- Se corre una sola vez desde el SQL Editor de Supabase

-- Peliculas: estreno, preventa y si se muestra en la cartelera
alter table peliculas add column if not exists fecha_estreno date;
alter table peliculas add column if not exists precio_preventa numeric default 0;
alter table peliculas add column if not exists visible boolean default true;
alter table peliculas add column if not exists entradas_vendidas integer default 0;

-- Reservas: productos del candy, si ya se entrego la comida y metodo de pago
alter table reservas add column if not exists items_candy jsonb default '[]';
alter table reservas add column if not exists candy_entregado boolean default false;
alter table reservas add column if not exists metodo_pago text;

-- Salas del cine (todas tienen la misma distribucion de butacas)
create table if not exists salas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique
);

insert into salas (nombre) values ('Sala 1'), ('Sala 2'), ('Sala 3'), ('Sala 4')
on conflict (nombre) do nothing;

-- Cupones: el de primera compra y los de mayores de 50
create table if not exists cupones (
  id uuid primary key default gen_random_uuid(),
  codigo text not null unique,
  porcentaje numeric not null,
  tipo text not null check (tipo in ('primera_compra', 'mayores_50'))
);

insert into cupones (codigo, porcentaje, tipo) values ('PRIMERACOMPRA', 20, 'primera_compra')
on conflict (codigo) do nothing;

-- Configuracion general (por ahora cuantos puntos cuesta una entrada)
create table if not exists configuracion (
  clave text primary key,
  valor numeric not null
);

insert into configuracion (clave, valor) values ('puntos_entrada', 500)
on conflict (clave) do nothing;

-- Historial de canjes de puntos
create table if not exists canjes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id),
  descripcion text not null,
  puntos integer not null,
  fecha timestamptz default now()
);


-- Tablas que ya se usaban (por si no estan creadas)
create table if not exists logs_auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id),
  tipo_accion text not null,
  detalle text,
  fecha_hora timestamptz default now()
);

create table if not exists alertas_estrenos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references usuarios(id),
  pelicula_id uuid references peliculas(id),
  activa boolean default true
);

-- Bucket para subir las portadas desde el panel admin
insert into storage.buckets (id, name, public) values ('peliculas', 'peliculas', true)
on conflict (id) do nothing;

do $$
begin
  create policy "subir portadas" on storage.objects for insert to authenticated
  with check (bucket_id = 'peliculas');
exception when others then null;
end $$;

-- Para que las butacas se actualicen en tiempo real (si ya estaba agregada no hace nada)
do $$
begin
  alter publication supabase_realtime add table reservas;
exception when others then null;
end $$;
