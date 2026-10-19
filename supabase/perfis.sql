-- =====================================================================
-- Vincula cada usuário de login à sua unidade.
-- Rode DEPOIS de criar os 10 usuários em Authentication > Users
-- (com exatamente estes e-mails).
-- =====================================================================

insert into public.perfis (id, unidade, admin)
select u.id, m.unidade, m.admin
from auth.users u
join (values
  ('smas@cronograma.local',                             'SMAS',                                 true),
  ('cras-sao-pedro@cronograma.local',                   'CRAS São Pedro',                       false),
  ('cras-cidade-nova@cronograma.local',                 'CRAS Cidade Nova',                    false),
  ('cras-ribeirinho@cronograma.local',                  'CRAS Ribeirinho',                     false),
  ('umai-joao-e-maria@cronograma.local',                'UMAI - João e Maria',                 false),
  ('coordenadoria-da-mulher@cronograma.local',          'Coordenadoria da Mulher',             false),
  ('casa-de-passagem-bom-samaritano@cronograma.local',  'Casa de Passagem - Bom Samaritano',   false),
  ('centro-de-convivencia-anita-valente@cronograma.local', 'Centro de Convivência Anita Valente', false),
  ('creas@cronograma.local',                            'CREAS',                               false),
  ('cad-cadastro-unico@cronograma.local',               'CAD - Cadastro Único',                false)
) as m(email, unidade, admin) on m.email = u.email
on conflict (id) do update set unidade = excluded.unidade, admin = excluded.admin;

-- Confira: deve listar as 10 unidades
select p.unidade, p.admin, u.email
from public.perfis p join auth.users u on u.id = p.id
order by p.admin desc, p.unidade;
