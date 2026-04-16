# JC Jardins

Projeto pronto para producao com foco em simplicidade, baixo custo e facilidade de manutencao.

## Stack escolhida

- `Frontend`: React + Vite
- `Backend/Banco`: Supabase
- `Banco de dados`: PostgreSQL gerenciado pelo Supabase
- `Deploy`: Vercel para o frontend
- `Painel administrativo`: mesma aplicacao web, com login via Supabase Auth

## Por que essa stack

- `Vite + React` entrega um frontend moderno, rapido e facil de evoluir para PWA ou app com React Native/Expo no futuro.
- `Supabase` evita montar e manter um backend Node separado agora. Ele ja entrega banco, API, Auth e regras de acesso.
- `Vercel` e uma das formas mais simples e economicas de publicar um projeto pequeno em React.
- Essa combinacao reduz custo inicial, simplifica manutencao e continua escalavel.

## Estrutura do projeto

- `.env.example`
- `.gitignore`
- `index.html`
- `package.json`
- `vite.config.js`
- `vercel.json`
- `src/App.jsx`
- `src/main.jsx`
- `src/styles.css`
- `src/lib/supabase.js`
- `supabase/schema.sql`

## Banco de dados

O schema esta em [supabase/schema.sql](C:\Users\gabri\Documents\New project\supabase\schema.sql).

### Tabelas criadas

- `clients`
  - id
  - name
  - phone
  - address
  - created_at

- `services`
  - id
  - slug
  - name
  - description
  - base_price
  - icon
  - sort_order
  - is_active
  - created_at

- `orders`
  - id
  - client_id
  - status
  - notes
  - source
  - total_amount
  - requested_at

- `order_items`
  - id
  - order_id
  - service_id
  - service_name_snapshot
  - price_snapshot
  - created_at

### Relacao entre tabelas

- um `client` pode ter varios `orders`
- um `order` pode ter varios `order_items`
- cada `order_item` aponta para um `service`

Isso deixa o sistema pronto para pedidos com varios servicos e facilita manutencao futura.

## Painel administrativo

O painel interno permite:

- visualizar clientes cadastrados
- visualizar pedidos recebidos
- visualizar quais servicos foram escolhidos
- alterar o status do pedido para:
  - `pendente`
  - `em andamento`
  - `concluido`

O acesso administrativo usa `Supabase Auth` com e-mail e senha.

## Como rodar localmente

### 1. Instalar dependencias

```bash
npm install
```

### 2. Criar arquivo `.env`

Copie o arquivo `.env.example` para `.env` e preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANON
VITE_WHATSAPP_NUMBER=554198370558
```

### O que vai em cada variavel

- `VITE_SUPABASE_URL`
  Valor exato do campo `Project URL` do seu projeto Supabase.
  Exemplo:
  `https://abcxyzcompany.supabase.co`

- `VITE_SUPABASE_ANON_KEY`
  Valor exato da chave publica `anon public`.
  Voce encontra em:
  `Supabase > Project Settings > API`

- `VITE_WHATSAPP_NUMBER`
  Numero no formato internacional, sem espacos nem simbolos.
  Para este projeto:
  `554198370558`

### 3. Rodar o projeto

```bash
npm run dev
```

### 4. Build de producao

```bash
npm run build
```

### 5. Visualizar build localmente

```bash
npm run preview
```

## Como conectar o banco de dados

### 1. Criar projeto no Supabase

1. Acesse [Supabase](https://supabase.com/)
2. Crie um novo projeto
3. Anote:
   - `Project URL`
   - `anon public key`

### 2. Rodar o schema SQL

1. No painel do Supabase, abra `SQL Editor`
2. Cole o conteudo de [supabase/schema.sql](C:\Users\gabri\Documents\New project\supabase\schema.sql)
3. Execute o script

Isso vai:

- criar as tabelas
- criar a funcao publica para registrar pedidos
- inserir os servicos padrao
- ativar politicas de seguranca

### 3. Criar o usuario admin

1. No Supabase, abra `Authentication`
2. Crie um usuario manualmente com e-mail e senha
3. Esse usuario sera usado para entrar no painel interno

### 4. Conectar o projeto com o Supabase

Depois de criar o projeto e rodar o SQL:

1. Copie `Project URL`
2. Copie `anon public key`
3. Cole os dois no arquivo `.env`
4. Rode `npm run dev`
5. O frontend vai usar automaticamente [src/lib/supabase.js](C:\Users\gabri\Documents\New project\src\lib\supabase.js) para conectar no banco

## Como publicar online da forma mais facil

### Plataforma recomendada

- `Frontend`: Vercel
- `Banco/Auth`: Supabase

Essa e a opcao mais simples e economica para um projeto pequeno que esta comecando.

### Passo a passo de deploy

1. Crie um projeto no Supabase.
2. Rode o SQL de [supabase/schema.sql](C:\Users\gabri\Documents\New project\supabase\schema.sql).
3. Crie um usuario admin em `Supabase Authentication`.
4. Teste localmente com:
   - `npm install`
   - `npm run dev`
5. Suba o projeto para um repositorio no GitHub.
6. Acesse [Vercel](https://vercel.com/).
7. Clique em `Add New Project`.
8. Importe o repositorio.
9. Em `Environment Variables`, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WHATSAPP_NUMBER`
10. Confirme que a Vercel usara:
   - `Build Command`: `npm run build`
   - `Output Directory`: `dist`
11. Clique em `Deploy`.

O arquivo [vercel.json](C:\Users\gabri\Documents\New project\vercel.json) ja foi adicionado para deixar essa configuracao explicita.

### Checklist rapido antes de publicar

- projeto criado no Supabase
- SQL executado no `SQL Editor`
- usuario admin criado
- `.env` testado localmente
- pedido publico salvando no banco
- painel admin abrindo e atualizando status
- variaveis de ambiente cadastradas na Vercel

## WhatsApp

O projeto mantem o botao de WhatsApp funcionando com:

- numero: `41 9837-0558`
- formato usado internamente: `554198370558`

O cliente pode:

- abrir o WhatsApp direto
- finalizar o pedido com mensagem pronta contendo:
  - nome
  - endereco
  - servicos selecionados
  - observacoes

## Responsividade

O layout foi organizado para funcionar em:

- celular
- tablet
- desktop

## Futuro app

A estrutura atual facilita evolucao para:

- `PWA`
- `app mobile com React Native / Expo`

Motivo:

- o frontend ja esta separado em React
- a camada de dados esta no Supabase
- a logica de negocio pode ser reaproveitada

## Arquivos principais

- [package.json](C:\Users\gabri\Documents\New project\package.json): scripts e dependencias
- [src/App.jsx](C:\Users\gabri\Documents\New project\src\App.jsx): interface principal do site e painel
- [src/lib/supabase.js](C:\Users\gabri\Documents\New project\src\lib\supabase.js): conexao com Supabase
- [src/styles.css](C:\Users\gabri\Documents\New project\src\styles.css): visual do projeto
- [supabase/schema.sql](C:\Users\gabri\Documents\New project\supabase\schema.sql): estrutura do banco

## Observacao importante

Este ambiente atual nao tem `node`/`npm` disponiveis para eu instalar dependencias e executar o build aqui dentro, entao eu deixei toda a estrutura pronta, mas voce ainda vai precisar rodar:

```bash
npm install
npm run dev
```

na sua maquina para testar localmente antes do deploy.

## Resumo direto

Se voce quer o caminho mais simples para colocar online:

1. Crie o projeto no Supabase
2. Rode o SQL
3. Preencha `.env`
4. Teste com `npm run dev`
5. Suba para GitHub
6. Importe na Vercel
7. Cadastre as mesmas variaveis de ambiente
8. Publique
