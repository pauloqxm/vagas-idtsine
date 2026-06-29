# Deploy — Portal público de vagas (IDT)

Aplicação **FastAPI + Uvicorn** que serve o frontend estático e expõe APIs de vagas, unidades e mapa. Os dados vêm de **planilhas publicadas no Google Sheets** (CSV), com cache em memória no servidor.

## Estrutura do projeto

```
vagas/
├── Dockerfile
├── DEPLOY.md
├── requirements.txt
├── run.bat
├── ce_regioes.geojson
├── backend/
│   ├── main.py
│   ├── api/routes.py
│   └── services/
│       ├── vagas_service.py
│       ├── unidades_service.py
│       └── regioes_service.py
└── frontend/
    ├── index.html
    ├── mapa.html
    ├── css/style.css
    └── js/
```

## Fonte de dados

O backend busca as planilhas publicadas no Google Sheets:

| Dado | Planilha |
|------|----------|
| Vagas | gid `187943237` |
| Unidades / postos | gid `1623874059` |

As URLs estão em `backend/services/vagas_service.py`. O servidor precisa de **acesso HTTPS de saída** para `docs.google.com`.

**Cache em memória:** vagas (5 min), unidades (1 h). No startup, as vagas são pré-carregadas em background.

Atualização manual do cache:

```text
GET /api/vagas/refresh
```

## Pré-requisitos

- Conta no [GitHub](https://github.com)
- Conta no [Railway](https://railway.app)
- Git instalado

## Passo 1: Repositório GitHub

```bash
cd vagas

git init
git add Dockerfile DEPLOY.md requirements.txt backend/ frontend/ ce_regioes.geojson
git commit -m "Deploy: portal público de vagas IDT"
git branch -M main
git remote add origin https://github.com/pauloqxm/vagas-idtsine.git
git push -u origin main
```

Inclua `ce_regioes.geojson` no repositório — o mapa usa `/api/geo/ce-regioes`.

## Passo 2: Deploy no Railway

### Dashboard

1. Acesse https://railway.app e faça login com GitHub
2. **New Project** → **Deploy from GitHub repo**
3. Selecione o repositório
4. Railway detecta o `Dockerfile` e faz o build
5. Em **Settings** → **Networking** → **Generate Domain**

### CLI

```bash
npm i -g @railway/cli
railway login
railway init
railway up
```

## Passo 3: Verificar

| URL | Esperado |
|-----|----------|
| `/` | Busca de vagas |
| `/mapa.html` | Mapa com unidades e regiões |
| `/api/vagas` | JSON com lista de vagas |
| `/api/unidades/geojson` | GeoJSON das unidades |
| `/api/geo/ce-regioes` | GeoJSON das regiões do CE |

## Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | `8020` | Porta de escuta (definida pelo Railway em produção) |

## Build local

```bash
docker build -t portal-vagas .
docker run -p 8020:8020 -e PORT=8020 portal-vagas
```

- http://localhost:8020/
- http://localhost:8020/mapa.html

## Desenvolvimento local (Windows)

```bat
run.bat
```

http://127.0.0.1:8020/

## Atualizações

- `git push` na branch conectada dispara novo deploy no Railway
- Alterações na planilha aparecem após o cache expirar ou após `/api/vagas/refresh`

## Troubleshooting

### Sem vagas

- Verifique `/api/vagas` (deve retornar `total > 0`)
- Confirme que as planilhas estão publicadas na web como CSV
- Veja os logs do container (erro ao buscar Google Sheets)
- Chame `/api/vagas/refresh`

### Mapa sem unidades

- Verifique `/api/unidades/geojson`
- Confirme que `ce_regioes.geojson` está na imagem

### Build ou inicialização

- Logs em Railway → **Deployments**
- Teste local: `docker build -t portal-vagas .`
- O app usa `PORT` do ambiente via Uvicorn

### Primeiro acesso lento

- Normal: o warm-up busca as planilhas no startup
- Requisições seguintes usam cache em memória
