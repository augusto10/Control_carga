-- Criar tabela de usuários
create table if not exists public.usuarios (
  id uuid default uuid_generate_v4() primary key,
  email text not null unique,
  senha text not null,
  nome text not null,
  cargo text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar tabela de transportadoras
create table if not exists public.transportadoras (
  id uuid default uuid_generate_v4() primary key,
  nome text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar tabela de motoristas
create table if not exists public.motoristas (
  id uuid default uuid_generate_v4() primary key,
  nome text not null,
  cpf text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar tabela de controles de carga
create table if not exists public.controles_carga (
  id uuid default uuid_generate_v4() primary key,
  numero_manifesto text not null,
  motorista_id uuid references public.motoristas(id),
  responsavel text not null,
  cpf_motorista text not null default 'PENDENTE',
  transportadora_id uuid references public.transportadoras(id),
  qtd_pallets integer not null,
  observacao text,
  data_criacao timestamp with time zone default timezone('utc'::text, now()) not null,
  data_finalizacao timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar tabela de notas fiscais
create table if not exists public.notas_fiscais (
  id uuid default uuid_generate_v4() primary key,
  numero text not null,
  serie text not null,
  valor numeric not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Criar tabela de relação entre controles e notas
create table if not exists public.controles_notas (
  controle_id uuid references public.controles_carga(id),
  nota_id uuid references public.notas_fiscais(id),
  primary key (controle_id, nota_id)
);

-- Criar função para gerar próximo número de manifesto
create or replace function public.gerar_proximo_numero_manifesto()
returns text as $$
begin
  return to_char(nextval('manifesto_seq'), 'FM000000');
end;
$$ language plpgsql;

-- Criar sequência para números de manifesto
create sequence if not exists public.manifesto_seq
  start with 1
  increment by 1
  no minvalue
  no maxvalue
  cache 1;

-- Criar função para atualizar timestamps
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Criar triggers para atualizar timestamps
create trigger update_usuarios_updated_at
  before update on public.usuarios
  for each row
  execute function public.update_updated_at_column();

create trigger update_transportadoras_updated_at
  before update on public.transportadoras
  for each row
  execute function public.update_updated_at_column();

create trigger update_motoristas_updated_at
  before update on public.motoristas
  for each row
  execute function public.update_updated_at_column();

create trigger update_controles_carga_updated_at
  before update on public.controles_carga
  for each row
  execute function public.update_updated_at_column();

create trigger update_notas_fiscais_updated_at
  before update on public.notas_fiscais
  for each row
  execute function public.update_updated_at_column();

-- Criar política de acesso para usuários
create policy "Users can view their own data"
  on public.usuarios
  for all
  using ( auth.uid() = id );

create policy "Users can view their own data"
  on public.controles_carga
  for all
  using ( auth.uid() = (select id from public.usuarios where email = responsavel) );

create policy "Users can view their own data"
  on public.notas_fiscais
  for all
  using ( exists (
    select 1 from public.controles_notas cn
    join public.controles_carga cc on cn.controle_id = cc.id
    where cn.nota_id = notas_fiscais.id
    and auth.uid() = (select id from public.usuarios where email = cc.responsavel)
  ) );
