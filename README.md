# Marketplace AI Inbox

MVP de um SaaS web app para atendimento com IA para vendedores de marketplaces, com foco inicial em perguntas do Mercado Livre.

O MVP usa CPAP Express como empresa única, mantém perguntas demo separadas e persiste integrações, tokens, perguntas, sugestões de IA e configurações em Supabase/PostgreSQL via SQLAlchemy.

## Estrutura

```text
backend/
  Dockerfile
  .env.example
  main.py
  database.py
  db_models.py
  db_seed.py
  requirements.txt
frontend/
  .env.example
  vercel.json
  index.html
  package.json
  src/
    App.jsx
    main.jsx
    styles.css
```

## Rodar localmente

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API local: `http://localhost:8000`

Endpoints simulados:

- `GET /health`
- `GET /questions`
- `GET /questions/{id}`
- `POST /questions/{id}/suggest`
- `POST /questions/{id}/approve`
- `POST /ai/rewrite`
- `GET /integrations/health`
- `POST /integrations/{id}/test`
- `GET /integrations/{id}/questions`
- `GET /integrations/mercadolivre/auth-url`
- `GET /integrations/mercadolivre/callback`
- `GET /integrations/mercadolivre/questions`
- `POST /integrations/mercadolivre/questions/{question_id}/answer`
- `GET /company/settings`
- `PUT /company/settings`
- `POST /company/settings`
- `POST /questions/generate`
- `POST /questions/answer`

Na primeira inicialização o backend cria as tabelas e faz seed de:

- empresa `CPAP Express`
- usuário `Admin`
- integração `mercado_livre`
- configurações padrão de IA

### Frontend

Em outro terminal:

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

App local: `http://localhost:5173`

## Variaveis de ambiente

### Backend

Configure em `backend/.env` localmente, ou no painel do Render/Railway em producao:

- `PORT`: porta usada pelo servidor. Em nuvem geralmente e definida automaticamente.
- `DATABASE_URL`: conexão PostgreSQL/Supabase. Se vazio, o backend usa SQLite local em `backend/marketplace_ai_inbox.db`.
- `SUPABASE_URL`: URL do projeto Supabase, reservada para futuras chamadas diretas à API Supabase.
- `SUPABASE_SERVICE_ROLE_KEY`: service role key do Supabase. Nunca exponha no frontend.
- `CORS_ORIGINS`: URLs do frontend separadas por virgula. Exemplo: `https://marketplace-ai-inbox.vercel.app`.
- `CORS_ORIGIN_REGEX`: opcional para previews da Vercel. Exemplo: `https://.*\.vercel\.app`.
- `OPENAI_API_KEY`: futura chave da OpenAI para gerar respostas reais.
- `OPENAI_MODEL`: modelo usado no endpoint `/ai/rewrite`. Padrao: `gpt-4o-mini`.
- `MERCADO_LIVRE_CLIENT_ID`, `MERCADO_LIVRE_CLIENT_SECRET`, `MERCADO_LIVRE_REDIRECT_URI`: futuras credenciais OAuth do Mercado Livre.
- `ML_CLIENT_ID`, `ML_CLIENT_SECRET`, `ML_REDIRECT_URI`: credenciais OAuth reais do Mercado Livre. `ML_REDIRECT_URI` deve ser exatamente a URL cadastrada no app Mercado Livre, por exemplo `https://SUA-API.onrender.com/integrations/mercadolivre/callback`.
- `FRONTEND_URL`: URL do frontend para voltar apos callback OAuth, por exemplo `https://SEU-FRONTEND.vercel.app`.

### Supabase / PostgreSQL

1. Crie um projeto no Supabase.
2. Abra **Project Settings > Database** e copie a connection string PostgreSQL.
3. Configure no backend:

```env
DATABASE_URL=postgresql://postgres:SUA-SENHA@db.SEU-PROJECT-REF.supabase.co:5432/postgres
SUPABASE_URL=https://SEU-PROJECT-REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=SUA_SERVICE_ROLE_KEY
```

4. Suba o backend. As tabelas são criadas automaticamente por SQLAlchemy no startup.
5. O OAuth do Mercado Livre passa a salvar `access_token`, `refresh_token`, `seller_id` e `expires_at` na tabela `integrations`.
6. Ao buscar perguntas reais, o backend faz upsert em `questions` por `company_id + provider + external_id` e cria a primeira sugestão em `ai_suggestions` apenas quando ela ainda não existe.
7. Sugestões são salvas em `suggestion_text`, edições em `edited_text` e respostas aprovadas em `final_answer`.

### Frontend

Configure em `frontend/.env` localmente, ou nas Environment Variables da Vercel:

- `VITE_API_URL`: URL publica do backend. Exemplo: `https://marketplace-ai-backend-ky72.onrender.com`.

## Deploy do backend no Render

1. Suba este projeto para um repositorio no GitHub.
2. No Render, crie um novo **Web Service**.
3. Conecte o repositorio.
4. Configure:
   - Root Directory: `backend`
   - Runtime: `Python`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
5. Em **Environment**, configure:
   - `CORS_ORIGINS=https://SEU-FRONTEND.vercel.app`
- Adicione `DATABASE_URL`, `OPENAI_API_KEY` e credenciais do Mercado Livre.
6. Depois do deploy, teste `https://SUA-API.onrender.com/health`.

## Deploy do backend no Railway

1. Crie um novo projeto no Railway a partir do GitHub.
2. Selecione o diretorio `backend`.
3. Configure o comando de start:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

4. Adicione as variaveis de ambiente:
   - `CORS_ORIGINS=https://SEU-FRONTEND.vercel.app`
- `DATABASE_URL`, `OPENAI_API_KEY` e credenciais Mercado Livre.
5. Use a URL publica gerada pelo Railway como `VITE_API_URL` no frontend.

## Deploy do backend com Docker

O backend inclui `backend/Dockerfile`.

```bash
cd backend
docker build -t marketplace-ai-inbox-api .
docker run -p 8000:8000 --env-file .env marketplace-ai-inbox-api
```

Render e Railway tambem conseguem usar o Dockerfile se voce escolher deploy via container.

## Deploy do frontend na Vercel

1. No Vercel, crie um novo projeto importando o repositorio.
2. Configure:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Em **Environment Variables**, configure:
   - `VITE_API_URL=https://SUA-API.onrender.com` ou a URL do Railway.
4. Faca o deploy.
5. Volte no backend e atualize `CORS_ORIGINS` com a URL final da Vercel.

## Opcao futura: PythonAnywhere

PythonAnywhere pode hospedar o backend FastAPI via ASGI, mas costuma exigir configuracao manual.

Passos gerais:

1. Envie a pasta `backend`.
2. Crie um virtualenv e instale `pip install -r requirements.txt`.
3. Configure as variaveis de ambiente no painel ou em um arquivo `.env`.
4. Configure o app web para servir `main:app` como aplicacao ASGI.
5. Defina `CORS_ORIGINS` com a URL do frontend na Vercel.

Para producao mais simples com FastAPI, Render ou Railway tendem a ser caminhos mais diretos.

## Integracoes futuras

- OpenAI: usado para sugestão inicial e reescrita quando `OPENAI_API_KEY` está configurada.
- Mercado Livre OAuth: o backend gera URL de autorização, recebe callback, persiste tokens no banco, renova token, busca perguntas e envia respostas aprovadas.
- Banco: a persistência atual usa SQLAlchemy com PostgreSQL/Supabase em produção e SQLite como fallback local.
- Conectores: a pasta `backend/integrations/` ja separa `client.py`, `mapper.py` e `service.py` por canal. Cada mapper converte payloads externos para `NormalizedQuestion` e preserva `raw_payload`.

## Notas do MVP

- Perguntas demo continuam no frontend e são carregadas somente pelo botão `Carregar perguntas demo`.
- Perguntas reais ficam no banco e não regeneram sugestão ao abrir a tela.
- A aprovação de pergunta real envia a resposta ao Mercado Livre antes de marcar como `Respondida`.
- A rejeicao esta implementada no frontend como estado local do MVP.
- O frontend so deve receber variaveis publicas prefixadas com `VITE_`; segredos ficam sempre no backend.
