# Página pública de vagas

Versão simples do portal para consulta de vagas pelo cidadão.

## Executar

Abra o arquivo:

```bat
run.bat
```

Por padrão, o servidor abre em:

```text
http://127.0.0.1:8020/
```

Para usar outra porta:

```bat
set PORT=8030
run.bat
```

## Dados

A página usa os arquivos locais:

- `lista_vagas.csv`
- `unidades_coordenadas.csv`

Depois de trocar os CSVs, reinicie o servidor ou acesse:

```text
http://127.0.0.1:8020/api/vagas/refresh
```
