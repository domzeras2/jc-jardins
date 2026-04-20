# JC Jardins

Projeto pronto para produção, com foco em simplicidade, baixo custo e facilidade de manutenção.

## Stack escolhida

- `Frontend`: React + Vite
- `Backend/Banco`: Supabase
- `Banco de dados`: PostgreSQL gerenciado pelo Supabase
- `Deploy`: Vercel para o frontend
- `Painel administrativo`: mesma aplicação web, com login via Supabase Auth

## Por que essa stack

- `Vite + React` entrega um frontend moderno, rápido e fácil de evoluir para PWA ou app com React Native/Expo no futuro.
- `Supabase` evita montar e manter um backend Node separado agora. Ele já entrega banco, API, Auth e regras de acesso.
- `Vercel` é uma das formas mais simples e econômicas de publicar um projeto pequeno em React.
- Essa combinação reduz o custo inicial, simplifica a manutenção e continua escalável.

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

O schema está em [supabase/schema.sql](C:\Users\gabri\Documents\New project\supabase\schema.sql).

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

- `budgets`
  - id
  - client_id
  - customer_name
  - customer_phone
  - customer_address
  - notes
  - status
  - subtotal_amount
  - total_amount
  - created_at

- `budget_items`
  - id
  - budget_id
  - service_id
  - service_name_snapshot
  - price_snapshot
  - created_at

- `reviews`
  - id
  - name
  - phone
  - neighborhood
  - rating
  - comment
  - status
  - created_at

- `admin_users`
  - id
  - user_id
  - email
  - full_name
  - created_at

### Relação entre tabelas

- um `client` pode ter vários `orders`
- um `order` pode ter vários `order_items`
- cada `order_item` aponta para um `service`
- um `client` pode ter vários `budgets`
- um `budget` pode ter vários `budget_items`

Isso deixa o sistema pronto para pedidos com vários serviços e facilita a manutenção futura.

## Painel administrativo

O painel interno permite:

- visualizar clientes cadastrados
- visualizar pedidos recebidos
- visualizar quais serviços foram escolhidos
- alterar o status do pedido para:
  - `pendente`
  - `em andamento`
  - `concluido`

O acesso administrativo usa `Supabase Auth` com e-mail e senha.

## Como rodar localmente

### 1. Instalar dependências

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

### O que vai em cada variável

- `VITE_SUPABASE_URL`
  Valor exato do campo `Project URL` do seu projeto Supabase.
  Exemplo:
  `https://abcxyzcompany.supabase.co`

- `VITE_SUPABASE_ANON_KEY`
  Valor exato da chave pública `anon public`.
  Você encontra em:
  `Supabase > Project Settings > API`

- `VITE_WHATSAPP_NUMBER`
  Número no formato internacional, sem espaços nem símbolos.
  Para este projeto:
  `554198370558`

### 3. Rodar o projeto

```bash
npm run dev
```

### 4. Build de produção

```bash
npm run build
```

### 5. Visualizar o build localmente

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
2. Cole o conteúdo de [supabase/schema.sql](C:\Users\gabri\Documents\New project\supabase\schema.sql)
3. Execute o script

Isso vai:

- criar as tabelas
- criar a função pública para registrar pedidos
- inserir os serviços padrão
- ativar políticas de segurança

### 3. Criar o usuário admin

1. No Supabase, abra `Authentication`
2. Crie um usuário manualmente com e-mail e senha
3. Esse usuário será usado para entrar no painel interno

### 4. Conectar o projeto ao Supabase

Depois de criar o projeto e rodar o SQL:

1. Copie `Project URL`
2. Copie `anon public key`
3. Cole os dois no arquivo `.env`
4. Rode `npm run dev`
5. O frontend vai usar automaticamente [src/lib/supabase.js](C:\Users\gabri\Documents\New project\src\lib\supabase.js) para conectar ao banco

## Como publicar online da forma mais fácil

### Plataforma recomendada

- `Frontend`: Vercel
- `Banco/Auth`: Supabase

Essa é a opção mais simples e econômica para um projeto pequeno que está começando.

### Passo a passo de deploy

1. Crie um projeto no Supabase.
2. Rode o SQL de [supabase/schema.sql](C:\Users\gabri\Documents\New project\supabase\schema.sql).
3. Crie um usuário admin em `Supabase Authentication`.
4. Teste localmente com:
   - `npm install`
   - `npm run dev`
5. Suba o projeto para um repositório no GitHub.
6. Acesse [Vercel](https://vercel.com/).
7. Clique em `Add New Project`.
8. Importe o repositório.
9. Em `Environment Variables`, adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_WHATSAPP_NUMBER`
10. Confirme que a Vercel usará:
   - `Build Command`: `npm run build`
   - `Output Directory`: `dist`
11. Clique em `Deploy`.

O arquivo [vercel.json](C:\Users\gabri\Documents\New project\vercel.json) já foi adicionado para deixar essa configuração explícita.

### Checklist rápido antes de publicar

- projeto criado no Supabase
- SQL executado no `SQL Editor`
- usuário admin criado
- `.env` testado localmente
- pedido público salvando no banco
- painel admin abrindo e atualizando status
- variáveis de ambiente cadastradas na Vercel

## WhatsApp

O projeto mantém o botão de WhatsApp funcionando com:

- número: `41 9837-0558`
- formato usado internamente: `554198370558`

O cliente pode:

- abrir o WhatsApp direto
- finalizar o pedido com mensagem pronta contendo:
  - nome
- endereço
- serviços selecionados
- observações

## Responsividade

O layout foi organizado para funcionar em:

- celular
- tablet
- desktop

## Futuro app

A estrutura atual facilita a evolução para:

- `PWA`
- `app mobile com React Native / Expo`

Motivo:

- o frontend já está separado em React
- a camada de dados está no Supabase
- a lógica de negócio pode ser reaproveitada

## Arquivos principais

- [package.json](C:\Users\gabri\Documents\New project\package.json): scripts e dependências
- [src/App.jsx](C:\Users\gabri\Documents\New project\src\App.jsx): interface principal do site e painel
- [src/lib/supabase.js](C:\Users\gabri\Documents\New project\src\lib\supabase.js): conexão com Supabase
- [src/styles.css](C:\Users\gabri\Documents\New project\src\styles.css): visual do projeto
- [supabase/schema.sql](C:\Users\gabri\Documents\New project\supabase\schema.sql): estrutura do banco

## Observação importante

Este ambiente atual não tem `node`/`npm` disponíveis para eu instalar dependências e executar o build aqui dentro, então eu deixei toda a estrutura pronta, mas você ainda vai precisar rodar:

```bash
npm install
npm run dev
```

na sua máquina para testar localmente antes do deploy.

## Resumo direto

Se você quer o caminho mais simples para colocar online:

1. Crie o projeto no Supabase
2. Rode o SQL
3. Preencha `.env`
4. Teste com `npm run dev`
5. Suba para GitHub
6. Importe na Vercel
7. Cadastre as mesmas variaveis de ambiente
8. Publique

## Painel administrativo completo

O painel agora foi estruturado com quatro áreas internas:

- `Dashboard`
- `Pedidos`
- `Serviços`
- `Clientes`

### Recursos do painel

- login com `Supabase Auth`
- validação extra pela tabela `admin_users`
- listagem de pedidos com troca de status
- cadastro, edição e remoção de serviços
- listagem de clientes com histórico básico de pedidos

### Tabela adicional necessária

- `admin_users`
  - id
  - user_id
  - email
  - full_name
  - created_at

### Como criar o primeiro usuário admin

1. Abra `Authentication > Users` no Supabase.
2. Crie o usuário com e-mail e senha.
3. Copie o `UUID` desse usuário.
4. Abra o `SQL Editor`.
5. Rode este SQL trocando os valores:

```sql
insert into public.admin_users (user_id, email, full_name)
values (
  'UUID_DO_USUARIO_AUTH',
  'admin@jcjardins.com',
  'Administrador JC Jardins'
);
```

Depois disso, esse usuário já pode fazer login no painel.

### Segurança aplicada

As políticas do arquivo [supabase/schema.sql](C:\Users\gabri\Documents\New project\supabase\schema.sql) agora usam a função `public.is_admin()`.

Na pratica:

- usuários públicos podem ver apenas serviços ativos
- usuários autenticados comuns não entram no painel se não estiverem em `admin_users`
- somente admins podem ler clientes, pedidos e itens de pedido
- somente admins podem criar, editar e remover serviços
