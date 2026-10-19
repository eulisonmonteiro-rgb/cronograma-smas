-- =====================================================================
-- Cronograma das Unidades – SMAS Oriximiná
-- Banco de dados (Supabase / PostgreSQL)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

-- ---------- Tabelas ----------

create table if not exists public.unidades (
  nome text primary key
);

insert into public.unidades (nome) values
  ('SMAS'),
  ('CRAS São Pedro'),
  ('CRAS Cidade Nova'),
  ('CRAS Ribeirinho'),
  ('UMAI - João e Maria'),
  ('Coordenadoria da Mulher'),
  ('Casa de Passagem - Bom Samaritano'),
  ('Centro de Convivência Anita Valente'),
  ('CREAS'),
  ('CAD - Cadastro Único')
on conflict (nome) do nothing;

-- Vínculo entre cada usuário de login e a sua unidade
create table if not exists public.perfis (
  id uuid primary key references auth.users (id) on delete cascade,
  unidade text not null unique references public.unidades (nome),
  admin boolean not null default false
);

create table if not exists public.atividades (
  id uuid primary key default gen_random_uuid(),
  data date not null,
  ini time not null,
  fim time not null,
  unidade text not null references public.unidades (nome),
  responsavel text not null check (char_length(responsavel) between 1 and 80),
  titulo text not null check (char_length(titulo) between 1 and 120),
  tipo text not null check (tipo in (
    'Reunião', 'Oficina', 'Capacitação', 'Visita técnica',
    'Evento', 'Atendimento coletivo', 'Campanha', 'Outro')),
  criado_por uuid references auth.users (id) on delete set null,
  atualizado_em timestamptz not null default now(),
  constraint horario_valido check (fim > ini)
);

create index if not exists atividades_data_idx on public.atividades (data);

create table if not exists public.logos (
  unidade text primary key references public.unidades (nome),
  data_url text not null check (char_length(data_url) <= 220000)
);

-- ---------- Funções auxiliares ----------

-- Unidade do usuário logado (null se não tiver perfil)
create or replace function public.minha_unidade()
returns text language sql stable security definer set search_path = public as $$
  select unidade from public.perfis where id = auth.uid()
$$;

-- O usuário logado é administrador (SMAS)?
create or replace function public.sou_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select admin from public.perfis where id = auth.uid()), false)
$$;

-- Palavras com mais de 3 letras de um título (usado na checagem de semelhança)
create or replace function public.palavras(t text)
returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct w), '{}'::text[])
  from regexp_split_to_table(lower(t), '[^[:alnum:]]+') as w
  where char_length(w) > 3
$$;

-- ---------- Regras de bloqueio ----------
-- Roda no banco, então vale para qualquer tela ou API.
-- O lock garante que duas gravações simultâneas não furem a regra.

create or replace function public.validar_atividade()
returns trigger language plpgsql set search_path = public as $$
declare
  c record;
  pa text[];
  pb text[];
  n int;
  total int;
begin
  perform pg_advisory_xact_lock(hashtext('cronograma-atividades'));

  new.criado_por := coalesce(new.criado_por, auth.uid());
  new.atualizado_em := now();

  -- 1) Mesmo dia com horário sobreposto (qualquer unidade)
  select titulo, unidade, ini, fim into c
  from public.atividades
  where data = new.data
    and id <> new.id
    and new.ini < fim
    and ini < new.fim
  limit 1;

  if found then
    raise exception 'Horário ocupado por "%" (%) das % às %.',
      c.titulo, c.unidade, to_char(c.ini, 'HH24:MI'), to_char(c.fim, 'HH24:MI');
  end if;

  -- 2) Outras unidades não podem lançar atividade semelhante à da SMAS
  --    em até 3 dias de distância
  if new.unidade <> 'SMAS' then
    pa := public.palavras(new.titulo);

    for c in
      select titulo, tipo, data from public.atividades
      where unidade = 'SMAS'
        and abs(data - new.data) <= 3
        and id <> new.id
    loop
      pb := public.palavras(c.titulo);
      total := greatest(cardinality(pa), cardinality(pb));
      n := (select count(*) from unnest(pa) x where x = any(pb));

      if c.tipo = new.tipo or (total > 0 and n::numeric / total >= 0.5) then
        raise exception 'Atividade semelhante à da SMAS "%" em % (distância de até 3 dias).',
          c.titulo, to_char(c.data, 'DD/MM/YYYY');
      end if;
    end loop;
  end if;

  return new;
end
$$;

drop trigger if exists trg_validar_atividade on public.atividades;
create trigger trg_validar_atividade
  before insert or update on public.atividades
  for each row execute function public.validar_atividade();

-- ---------- Segurança (RLS) ----------
-- Mesmo com a chave pública no site, o banco só deixa cada unidade
-- alterar o que é dela. A SMAS (admin) altera tudo.

alter table public.unidades enable row level security;
alter table public.perfis enable row level security;
alter table public.atividades enable row level security;
alter table public.logos enable row level security;

drop policy if exists "ler unidades" on public.unidades;
create policy "ler unidades" on public.unidades
  for select to authenticated using (true);

drop policy if exists "ler proprio perfil" on public.perfis;
create policy "ler proprio perfil" on public.perfis
  for select to authenticated using (id = auth.uid());

drop policy if exists "ler atividades" on public.atividades;
create policy "ler atividades" on public.atividades
  for select to authenticated using (true);

drop policy if exists "criar atividades" on public.atividades;
create policy "criar atividades" on public.atividades
  for insert to authenticated
  with check (unidade = public.minha_unidade() or public.sou_admin());

drop policy if exists "alterar atividades" on public.atividades;
create policy "alterar atividades" on public.atividades
  for update to authenticated
  using (unidade = public.minha_unidade() or public.sou_admin())
  with check (unidade = public.minha_unidade() or public.sou_admin());

drop policy if exists "excluir atividades" on public.atividades;
create policy "excluir atividades" on public.atividades
  for delete to authenticated
  using (unidade = public.minha_unidade() or public.sou_admin());

drop policy if exists "ler logos" on public.logos;
create policy "ler logos" on public.logos
  for select to authenticated using (true);

drop policy if exists "criar logos" on public.logos;
create policy "criar logos" on public.logos
  for insert to authenticated
  with check (unidade = public.minha_unidade() or public.sou_admin());

drop policy if exists "alterar logos" on public.logos;
create policy "alterar logos" on public.logos
  for update to authenticated
  using (unidade = public.minha_unidade() or public.sou_admin())
  with check (unidade = public.minha_unidade() or public.sou_admin());

drop policy if exists "excluir logos" on public.logos;
create policy "excluir logos" on public.logos
  for delete to authenticated
  using (unidade = public.minha_unidade() or public.sou_admin());

-- ---------- Tempo real ----------
-- Faz a tela de cada unidade atualizar sozinha quando outra unidade altera algo.

do $$
begin
  alter publication supabase_realtime add table public.atividades;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.logos;
exception when duplicate_object then null;
end $$;
