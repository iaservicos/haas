# Backend - Portal de Vistoria HaaS

API REST em Node.js + Express + TypeScript

## Setup

1. Instalar dependências:
```bash
npm install
```

2. Criar arquivo `.env`:
```bash
cp .env.example .env
```

3. Preencher `.env` com credenciais Supabase

## Desenvolvimento

```bash
npm run dev
```

Servidor rodará em `http://localhost:3001`

## Build

```bash
npm run build
```

Gera pasta `dist/` pronta para produção

## Endpoints

- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/vistorias` - Listar vistorias
- `GET /api/vistorias/:id` - Obter vistoria
- `POST /api/vistorias` - Criar vistoria
- `PUT /api/vistorias/:id` - Atualizar vistoria
- `DELETE /api/vistorias/:id` - Deletar vistoria
- `GET /api/componentes/vistoria/:vistoriaId` - Listar componentes
- `POST /api/componentes` - Criar componente
- `PUT /api/componentes/:id` - Atualizar componente
- `DELETE /api/componentes/:id` - Deletar componente
- `GET /api/fotos` - Listar fotos
- `GET /api/fotos/vistoria/:vistoriaId` - Listar fotos da vistoria
- `POST /api/fotos` - Criar foto
- `DELETE /api/fotos/:id` - Deletar foto
