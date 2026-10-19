// =====================================================================
// Configuração do site. Preencha com os dados do seu projeto Supabase
// (Project Settings > API). A chave "anon" é pública por natureza:
// quem protege os dados são as regras do banco (RLS), não esta chave.
// NUNCA coloque aqui a chave "service_role".
// =====================================================================
window.CONFIG = {
  SUPABASE_URL: "https://benfppewdxhmmtljfgmg.supabase.co",
  SUPABASE_ANON_KEY: "sb_publishable_dMRup8kSDkBFemNkD3Cq6Q_XASxrJwc",

  ADMIN: "SMAS",
  JANELA_DIAS: 3,            // deve ser o mesmo valor usado no schema.sql

  TIPOS: [
    "Reunião", "Oficina", "Capacitação", "Visita técnica",
    "Evento", "Atendimento coletivo", "Campanha", "Outro"
  ],

  // Nome exibido da unidade e o e-mail do usuário de login correspondente.
  // Os e-mails precisam ser os mesmos cadastrados no Supabase e no perfis.sql.
  UNIDADES: [
    { nome: "SMAS",                                 email: "smas@cronograma.local" },
    { nome: "CRAS São Pedro",                       email: "cras-sao-pedro@cronograma.local" },
    { nome: "CRAS Cidade Nova",                     email: "cras-cidade-nova@cronograma.local" },
    { nome: "CRAS Ribeirinho",                      email: "cras-ribeirinho@cronograma.local" },
    { nome: "UMAI - João e Maria",                  email: "umai-joao-e-maria@cronograma.local" },
    { nome: "Coordenadoria da Mulher",              email: "coordenadoria-da-mulher@cronograma.local" },
    { nome: "Casa de Passagem - Bom Samaritano",    email: "casa-de-passagem-bom-samaritano@cronograma.local" },
    { nome: "Centro de Convivência Anita Valente",  email: "centro-de-convivencia-anita-valente@cronograma.local" },
    { nome: "CREAS",                                email: "creas@cronograma.local" },
    { nome: "CAD - Cadastro Único",                 email: "cad-cadastro-unico@cronograma.local" }
  ]
};
