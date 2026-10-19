# Cronograma das Unidades – SMAS Oriximiná

Site estático (GitHub Pages) que roda no computador e no celular. Os dados ficam no Supabase, e as regras de bloqueio e o controle de acesso por unidade ficam no próprio banco.

## Como funciona

- **Tela:** `index.html`, `style.css`, `app.js` (publicados pelo GitHub Pages).
- **Dados e login:** Supabase (plano gratuito), com um usuário por unidade.
- **Regras no banco:** `supabase/schema.sql` impede conflito de horário e atividade semelhante à da SMAS, mesmo se alguém tentar burlar a tela.
- **Tempo real:** quando uma unidade altera algo, as outras veem a mudança sem recarregar.
- **Responsivo:** no celular, o calendário e a lista de atividades se ajustam à largura da tela.

## Passo a passo

### 1. Criar o projeto no Supabase

1. Entre em https://supabase.com e crie uma conta.
2. **New project**. Escolha uma senha forte para o banco e, se disponível, a região South America (São Paulo).
3. Aguarde a criação do projeto.

### 2. Criar o banco

1. No menu lateral, abra **SQL Editor** > **New query**.
2. Cole o conteúdo de `supabase/schema.sql` e clique em **Run**.

### 3. Criar os usuários das unidades

1. Em **Authentication** > **Providers** > **Email**, desative **Confirm email** e salve.
2. Em **Authentication** > **Users** > **Add user** > **Create new user**, crie 10 usuários com os e-mails abaixo, marcando **Auto Confirm User**. Defina uma senha para cada um (mínimo de 6 caracteres).

| Unidade | E-mail |
|---|---|
| SMAS | smas@cronograma.local |
| CRAS São Pedro | cras-sao-pedro@cronograma.local |
| CRAS Cidade Nova | cras-cidade-nova@cronograma.local |
| CRAS Ribeirinho | cras-ribeirinho@cronograma.local |
| UMAI - João e Maria | umai-joao-e-maria@cronograma.local |
| Coordenadoria da Mulher | coordenadoria-da-mulher@cronograma.local |
| Casa de Passagem - Bom Samaritano | casa-de-passagem-bom-samaritano@cronograma.local |
| Centro de Convivência Anita Valente | centro-de-convivencia-anita-valente@cronograma.local |
| CREAS | creas@cronograma.local |
| CAD - Cadastro Único | cad-cadastro-unico@cronograma.local |

> Se o Supabase recusar o domínio `.local`, escolha outro domínio qualquer e troque o domínio em **todos** os lugares: `config.js`, `supabase/perfis.sql` e a tabela acima.

### 4. Vincular cada usuário à sua unidade

1. No **SQL Editor**, cole o conteúdo de `supabase/perfis.sql` e clique em **Run**.
2. O resultado deve listar as 10 unidades. Se alguma faltar, confira o e-mail daquele usuário.

### 5. Configurar o site

1. Em **Project Settings** > **API**, copie a **Project URL** e a chave **anon public**.
2. Abra `config.js` e cole esses valores em `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

> Use somente a chave **anon**. A chave **service_role** nunca deve estar no site.

### 6. Publicar no GitHub

1. Crie um repositório **público** no GitHub, por exemplo `cronograma-smas`.
   O GitHub Pages gratuito só funciona com repositórios públicos. Isso não expõe dados: as atividades ficam no Supabase, e o código não contém senhas.
2. Envie todos os arquivos desta pasta para o repositório.
3. Em **Settings** > **Pages**, escolha **Deploy from a branch**, branch `main`, pasta `/ (root)`, e salve.
4. Em alguns minutos, o endereço fica disponível em `https://SEU-USUARIO.github.io/cronograma-smas/`.

### 7. Ajustar a URL de retorno (somente se houver confirmação por e-mail)

Como os usuários são criados com confirmação automática, esta etapa não é necessária. Se você ativar a confirmação de e-mail no futuro, em **Authentication** > **URL Configuration** adicione o endereço do GitHub Pages em **Site URL**.

## Operação do dia a dia

- **Trocar a senha de uma unidade:** em **Authentication** > **Users**, clique no usuário > **Send password recovery** ou **Update password**. A troca pela tela não é feita, por segurança.
- **Backup:** a SMAS, na tela, usa o botão **Backup** > **Baixar backup** (arquivo JSON). Também é possível exportar tudo pelo painel do Supabase em **Table Editor**.
- **Restaurar:** a SMAS usa o botão **Backup** > escolhe o arquivo > **Restaurar**. Isso substitui todo o cronograma.
- **Regras de bloqueio:** a janela de 3 dias está no `schema.sql` (função `validar_atividade`). Para mudar, ajuste o número `3` e o valor `JANELA_DIAS` em `config.js`.

## Limites conhecidos

- Os dados e as senhas dependem do Supabase. Se o plano gratuito for excedido, a tela avisa, mas não há cópia local.
- O plano gratuito do Supabase pausa projetos sem uso por um período. Basta abrir o painel para reativar.
- O PDF é gerado no próprio navegador e baixado como arquivo.

## Estrutura

```
index.html          tela
style.css           aparência (inclui celular e modo escuro)
app.js              lógica da tela
config.js           endereço do Supabase e lista de unidades
supabase/
  schema.sql        tabelas, regras de bloqueio, segurança e tempo real
  perfis.sql        vínculo usuário → unidade
```
