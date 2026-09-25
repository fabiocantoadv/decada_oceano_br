# Década do Oceano BR — painel de publicações brasileiras sobre o oceano

Painel interativo da produção científica brasileira sobre mar e oceano, com
dados do [OpenAlex](https://openalex.org).

**Painel online:** https://fabiocantoadv.github.io/decada_oceano_br/

## Recorte dos dados

Obras do OpenAlex com:

- ano de publicação a partir de 2018;
- pelo menos um autor com afiliação no Brasil (`authorships.countries:BR`);
- tipo artigo ou revisão;
- **e** termos de mar/oceano combinados a temas ambientais e sociais no título
  ou resumo (em português e inglês), **ou** tópico principal nas subáreas
  Oceanography (1910) ou Ocean Engineering (2212).

A consulta completa está em `collect_openalex.py`, e a data e as contagens da
última coleta estão em `openalex_collection_meta.json`.

## O que o painel mostra

Total de publicações; evolução por ano; idioma; tipo de documento; colaboração
científica (só autores brasileiros × internacional); autores (com ORCID),
instituições, fontes e países; acesso aberto e modelo de acesso; áreas,
subáreas e tópicos de pesquisa; gênero dos autores e do primeiro autor, com
uma tabela de conferência dos primeiros nomes; e a listagem das publicações, com links para o
OpenAlex e o DOI. Clicar em qualquer gráfico ou tabela filtra o painel inteiro.

## Como atualizar os dados

```bash
# 1. Coleta os dados brutos na API do OpenAlex (~500 MB, fica fora do git)
export OPENALEX_API_KEY=sua_chave   # opcional, recomendado
python3 collect_openalex.py

# 2. Classifica o gênero dos autores pelo primeiro nome (base de nomes do IBGE,
#    Censo 2010, via Brasil.IO: https://data.brasil.io/dataset/genero-nomes/nomes.csv.gz)
python3 classify_gender_ibge.py --ibge caminho/para/nomes.csv.gz
#    e dos autores só com vínculo estrangeiro pelo país de afiliação (WGND 2.0,
#    WIPO: https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/MSEGSJ — pasta com os CSVs da WGND)
python3 classify_gender_wgnd_foreign.py --wgnd caminho/para/dataverse_files

# 3. Gera dashboard_data.js a partir da coleta e da classificação de gênero
python3 build_dashboard.py

# 4. Publica
git add dashboard_data.js dashboard_data.json openalex_collection_meta.json genero_ibge/ genero_wgnd/
git commit -m "data: atualiza coleta do OpenAlex"
git push
```

## Estrutura

| Arquivo | Função |
|---|---|
| `index.html`, `app.js`, `styles.css` | Painel (estático, sem build) |
| `metodologia.html` | Página de metodologia (aberta pelo botão no cabeçalho) |
| `collection_meta.js` | Data e contagens da coleta, gerados pelo build para a metodologia |
| `lib/` | Vega, Vega-Lite e Vega-Embed locais |
| `dashboard_data.js` | Dados do painel, gerados por `build_dashboard.py` |
| `collect_openalex.py` | Coleta na API do OpenAlex |
| `build_dashboard.py` | Processa a coleta e gera os dados do painel |
| `openalex_country_names.csv` | Nomes dos países como exibidos no OpenAlex |
| `classify_gender_ibge.py` | Classificação de gênero dos autores pelo primeiro nome (IBGE) |
| `classify_gender_wgnd_foreign.py` | Classificação dos autores estrangeiros pela WGND 2.0, pelo país |
| `genero_ibge/`, `genero_wgnd/` | Resultados da classificação de gênero (IBGE e WGND) |
| `build_dashboard_data.py`, `collect_*gender*.py`, `collect_crossref_*.py` | Pipeline do painel anterior (referência para a análise de gênero) |

Para ver localmente, basta abrir `index.html` no navegador.

> **Cache:** o `build_dashboard.py` grava em `index.html` uma versão (`?v=…`)
> calculada a partir do conteúdo de `app.js`, `styles.css` e `dashboard_data.js`.
> Depois de editar qualquer um desses arquivos, rode `python3 build_dashboard.py`
> antes do commit, para os navegadores baixarem a versão nova.

Baseado no projeto [oceanvega](https://github.com/wadsonlemos/oceanvega).

## Gênero dos autores

O gênero é uma **previsão estatística a partir do primeiro nome**, não uma
autodeclaração. Autores com vínculo no Brasil (ou sem país) usam a base de nomes
do Censo 2010 do IBGE (versão do [Brasil.IO](https://brasil.io/dataset/genero-nomes/nomes/));
autores só com vínculo estrangeiro usam a [WGND 2.0](https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/MSEGSJ) (WIPO) pelo país de afiliação.
Um nome é Feminino ou Masculino quando ao menos 90% das ocorrências são desse
gênero; nomes abreviados, ambíguos ou ausentes da base ficam como Indefinido.
