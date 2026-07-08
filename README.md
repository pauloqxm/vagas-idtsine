# Portal público de vagas — IDT

Consulta de vagas de emprego com busca, filtros, mapa do Ceará e detalhes das unidades.

## Executar localmente

```bat
run.bat
```

Abre em: http://127.0.0.1:8020/

Outra porta:

```bat
set PORT=8030
run.bat
```

## Páginas

| URL | Descrição |
|-----|-----------|
| `/` | Busca de vagas, KPIs, FAQ |
| `/mapa.html` | Mapa com unidades e tabela de vagas |

## Dados

As vagas e unidades vêm de **planilhas publicadas no Google Sheets** (sem CSV local em produção).

- URLs configuradas em `backend/services/vagas_service.py`
- Cache: vagas 5 min, unidades 1 h
- Forçar atualização: `GET /api/vagas/refresh`

## Deploy

Ver `DEPLOY.md`. Repositório: https://github.com/pauloqxm/vagas-idtsine

```bash
docker build -t portal-vagas .
docker run -p 8020:8020 -e PORT=8020 portal-vagas
```

## Contexto completo

Documentação para o Cursor/assistente: `../CONTEXT_VAGAS_EMPREGO.md`
