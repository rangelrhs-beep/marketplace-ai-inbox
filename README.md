# Marketplace AI Inbox

MVP de um SaaS web app para atendimento com IA para vendedores de marketplaces, com foco inicial em perguntas do Mercado Livre.

O projeto ainda usa dados mockados, mas ja esta preparado para deploy em nuvem e para futuras integracoes com OpenAI, Mercado Livre e MySQL.

## Estrutura

```text
backend/
  Dockerfile
  .env.example
  main.py
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
- `CORS_ORIGINS`: URLs do frontend separadas por virgula. Exemplo: `https://marketplace-ai-inbox.vercel.app`.
- `CORS_ORIGIN_REGEX`: opcional para previews da Vercel. Exemplo: `https://.*\.vercel\.app`.
- `OPENAI_API_KEY`: futura chave da OpenAI para gerar respostas reais.
- `MERCADO_LIVRE_CLIENT_ID`, `MERCADO_LIVRE_CLIENT_SECRET`, `MERCADO_LIVRE_REDIRECT_URI`: futuras credenciais OAuth do Mercado Livre.
- `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`: futura conexao MySQL.

### Frontend

Configure em `frontend/.env` localmente, ou nas Environment Variables da Vercel:

- `VITE_API_URL`: URL publica do backend. Exemplo: `https://marketplace-ai-inbox-api.onrender.com`.

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
   - Futuramente, adicione `OPENAI_API_KEY`, credenciais do Mercado Livre e MySQL.
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
   - Futuramente, `OPENAI_API_KEY`, Mercado Livre e MySQL.
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

- OpenAI: substituir a logica mockada de `POST /questions/{id}/suggest` por uma chamada usando `OPENAI_API_KEY`.
- Mercado Livre: criar fluxo OAuth com `MERCADO_LIVRE_CLIENT_ID`, `MERCADO_LIVRE_CLIENT_SECRET` e `MERCADO_LIVRE_REDIRECT_URI`, depois buscar perguntas reais pela API.
- MySQL: trocar a lista em memoria `questions` por modelos e repositorios usando as variaveis `MYSQL_*`.

## Notas do MVP

- Os dados continuam mockados em memoria.
- A aprovacao muda o status para `Respondida`.
- A rejeicao esta implementada no frontend como estado local do MVP.
- O frontend so deve receber variaveis publicas prefixadas com `VITE_`; segredos ficam sempre no backend.
