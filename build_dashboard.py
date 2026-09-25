#!/usr/bin/env python3
"""
Gera dashboard_data.js / dashboard_data.json a partir da coleta do OpenAlex
(openalex_raw/*.jsonl, produzidos por collect_openalex.py).

Lê as obras linha a linha (sem carregar os ~500 MB na memória), deduplica
pelo ID do OpenAlex e codifica cada obra como uma linha compacta com índices
para dicionários de valores.

Campos por obra (ordem em "data"):
  0 ano
  1 idioma          -> dicts.languages
  2 tipo            -> dicts.types
  3 área            -> dicts.areas         (primary_topic.field)
  4 subárea         -> dicts.subareas      (primary_topic.subfield)
  5 fonte           -> dicts.sources       (primary_location.source)
  6 instituições    -> lista de índices em dicts.institutions
                       (todas as instituições distintas dos autores da obra)
  7 tópicos         -> lista de índices em dicts.topics
                       (todos os tópicos atribuídos à obra, até 3 no OpenAlex)
  8 países          -> lista de índices em dicts.countries
                       (países distintos dos autores — authorships.countries;
                        nomes como no OpenAlex, via openalex_country_names.csv)
  9 modelo de acesso -> dicts.oa_statuses  (open_access.oa_status: diamond, gold,
                       green, bronze, hybrid ou closed; aberto = tudo que não é closed)
 10 autores         -> lista na ordem da autoria: índice em dicts.authors /
                       dicts.author_orcids (autor com ID do OpenAlex) ou o nome, como
                       texto, quando o autor não tem ID (só aparece na listagem)
 11 título
 12 ID do work no OpenAlex (ex.: W1234567890)
 13 DOI sem o prefixo https://doi.org/ ("" se não houver)
 14 citações (cited_by_count) — usado só para ordenar a listagem
 15 ODS            -> lista de números dos Objetivos de Desenvolvimento Sustentável
                       (sustainable_development_goals do OpenAlex, score >= 0,4)
 16 gênero do 1º autor -> F, M ou I (IBGE; WGND se o autor for só estrangeiro)
 17 escopo do 1º autor  -> B (vínculo no Brasil na obra), E (só estrangeiro) ou N (sem país)
"""
import csv
import hashlib
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "openalex_raw")
QUERIES = ["textual", "subfields"]
OUT_JSON = os.path.join(HERE, "dashboard_data.json")
OUT_JS = os.path.join(HERE, "dashboard_data.js")
COUNTRY_NAMES_CSV = os.path.join(HERE, "openalex_country_names.csv")
# Gênero dos autores (gerado por classify_gender_ibge.py; opcional)
AUTHOR_GENDER_CSV = os.path.join(HERE, "genero_ibge", "autores_genero_ibge.csv")
WORK_FIRST_AUTHOR_CSV = os.path.join(HERE, "genero_ibge", "obras_primeiro_autor.csv")
# Autores só com afiliação estrangeira: WGND 2.0 pelo país (classify_gender_wgnd_foreign.py)
WGND_FOREIGN_CSV = os.path.join(HERE, "genero_wgnd", "autores_estrangeiros_wgnd.csv")
GENDER_CODE = {"FEMININO": "F", "MASCULINO": "M"}

NO_INST = "Sem instituição"
UNKNOWN_SOURCE = "Fonte desconhecida"
OTHER = "Outros"

dicts = {k: [] for k in ("languages", "types", "areas", "subareas", "sources", "institutions", "topics", "countries", "oa_statuses")}
index = {k: {} for k in dicts}


def idx(kind, value):
    table = index[kind]
    if value not in table:
        table[value] = len(dicts[kind])
        dicts[kind].append(value)
    return table[value]


def get(d, *path):
    for p in path:
        if not isinstance(d, dict):
            return None
        d = d.get(p)
    return d


# Códigos ISO -> nome exibido pelo OpenAlex (export de authorships.countries)
country_names = {}
with open(COUNTRY_NAMES_CSV, encoding="utf-8") as f:
    for r in csv.DictReader(f):
        country_names[r["id"].strip().upper()] = r["display_name"].strip()

# Autores: indexados pelo ID do OpenAlex (nomes se repetem entre pessoas diferentes)
dicts["authors"] = []
dicts["author_orcids"] = []  # ORCID sem o prefixo https://orcid.org/ ("" se não houver)
dicts["author_genders"] = []  # F, M ou I — ver classify_gender_ibge.py
dicts["author_first_names"] = []  # índice em dicts.first_names (-1 se não houver)
dicts["author_scopes"] = []  # B (vínculo no Brasil), E (só estrangeiro) ou N (sem país)
author_index = {}


def author_idx(aid, name, orcid):
    orcid = (orcid or "").rsplit("/", 1)[-1]
    if aid not in author_index:
        author_index[aid] = len(dicts["authors"])
        dicts["authors"].append(name or aid)
        dicts["author_orcids"].append(orcid)
        dicts["author_genders"].append(author_gender.get(aid.rsplit("/", 1)[-1], "I"))
        dicts["author_scopes"].append(author_scope.get(aid.rsplit("/", 1)[-1], "N"))
        dicts["author_first_names"].append(author_first.get(aid.rsplit("/", 1)[-1], -1))
    elif orcid and not dicts["author_orcids"][author_index[aid]]:
        dicts["author_orcids"][author_index[aid]] = orcid
    return author_index[aid]


# Gênero previsto de cada autor pelo primeiro nome (IBGE): F, M ou I (indefinido)
# Gênero de cada autor: IBGE para autores com vínculo no Brasil (ou sem país) e
# WGND 2.0 pelo país de afiliação para autores só com vínculo estrangeiro.
# Escopo do autor: B = com vínculo no Brasil, E = só estrangeiro, N = sem país.
author_gender = {}
author_scope = {}
# Tabela de conferência: primeiros nomes agrupados por (nome, gênero, base, motivo);
# cada item = [nome, gênero F/M/I, proporção feminina no IBGE (ou null),
#              pessoas no IBGE (ou 0), motivo, base "IBGE"|"WGND"]
author_first = {}
first_name_index = {}
dicts["first_names"] = []

wgnd = {}
if os.path.exists(WGND_FOREIGN_CSV):
    with open(WGND_FOREIGN_CSV, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            wgnd[r["author_id"]] = r
    print(f"WGND: {len(wgnd):,} autores estrangeiros classificados carregados")
else:
    print("Aviso: genero_wgnd/autores_estrangeiros_wgnd.csv não encontrado; estrangeiros usarão o IBGE")

if os.path.exists(AUTHOR_GENDER_CSV):
    with open(AUTHOR_GENDER_CSV, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            aid = r["author_id"]
            paises = [p for p in r["paises"].split(";") if p]
            scope = "B" if "BR" in paises else ("E" if paises else "N")
            author_scope[aid] = scope
            fn = r["primeiro_nome"]
            if scope == "E" and aid in wgnd:
                w = wgnd[aid]
                g = GENDER_CODE.get(w["genero_wgnd"], "I")
                key = (fn, g, "WGND", w["motivo_wgnd"])
                entry = [fn, g, None, 0, w["motivo_wgnd"], "WGND"]
            else:
                g = GENDER_CODE.get(r["genero"], "I")
                pf = r.get("prop_feminina_ibge", "")
                key = (fn, g, "IBGE", r["motivo"])
                entry = [fn, g, round(float(pf), 4) if pf else None, int(r["freq_ibge"] or 0), r["motivo"], "IBGE"]
            author_gender[aid] = g
            if key not in first_name_index:
                first_name_index[key] = len(dicts["first_names"])
                dicts["first_names"].append(entry)
            author_first[aid] = first_name_index[key]
    print(f"Gênero: {len(author_gender):,} autores classificados carregados")
else:
    print("Aviso: genero_ibge/autores_genero_ibge.csv não encontrado; gênero dos autores ficará indefinido")

# Gênero e escopo do primeiro autor de cada obra (inclui autores sem ID no OpenAlex).
# O escopo usa os países do primeiro autor NAQUELA obra.
first_author_gender = {}
first_author_scope = {}
if os.path.exists(WORK_FIRST_AUTHOR_CSV):
    with open(WORK_FIRST_AUTHOR_CSV, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            aid = r["author_id"]
            g = author_gender.get(aid, GENDER_CODE.get(r["genero_primeiro_autor"], "I"))
            paises = [p for p in (r.get("paises_primeiro_autor") or "").split(";") if p]
            first_author_gender[r["work_id"]] = g
            first_author_scope[r["work_id"]] = "B" if "BR" in paises else ("E" if paises else "N")

seen = set()
rows = []
per_query = {}
for q in QUERIES:
    path = os.path.join(RAW_DIR, f"{q}.jsonl")
    n = 0
    with open(path, encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            w = json.loads(line)
            wid = w.get("id")
            if wid in seen:
                continue
            seen.add(wid)
            n += 1

            insts = []
            for a in w.get("authorships") or []:
                for inst in a.get("institutions") or []:
                    name = (inst.get("display_name") or "").strip()
                    if name and name not in insts:
                        insts.append(name)
            if not insts:
                insts = [NO_INST]

            topics = []
            for t in w.get("topics") or []:
                name = (t.get("display_name") or "").strip()
                if name and name not in topics:
                    topics.append(name)

            authors = []
            for a in w.get("authorships") or []:
                au = a.get("author") or {}
                if au.get("id"):
                    i = author_idx(au["id"], (au.get("display_name") or "").strip(), au.get("orcid"))
                    if i not in authors:
                        authors.append(i)
                else:
                    name = (au.get("display_name") or a.get("raw_author_name") or "").strip()
                    if name:
                        authors.append(name)

            countries = []
            for a in w.get("authorships") or []:
                for code in a.get("countries") or []:
                    code = code.strip().upper()
                    if code and code not in countries:
                        countries.append(code)

            rows.append([
                w.get("publication_year"),
                idx("languages", (w.get("language") or "unknown").lower()),
                idx("types", w.get("type") or "unknown"),
                idx("areas", get(w, "primary_topic", "field", "display_name") or OTHER),
                idx("subareas", get(w, "primary_topic", "subfield", "display_name") or OTHER),
                idx("sources", get(w, "primary_location", "source", "display_name") or UNKNOWN_SOURCE),
                [idx("institutions", i) for i in insts],
                [idx("topics", t) for t in topics],
                [idx("countries", country_names.get(c, c)) for c in countries],
                idx("oa_statuses", get(w, "open_access", "oa_status") or "unknown"),
                authors,
                (w.get("title") or w.get("display_name") or "").strip(),
                wid.rsplit("/", 1)[-1],
                (w.get("doi") or "").replace("https://doi.org/", ""),
                w.get("cited_by_count") or 0,
                sorted({int(g["id"].rsplit("/", 1)[-1]) for g in (w.get("sustainable_development_goals") or [])
                        if g.get("id")}),
                first_author_gender.get(wid.rsplit("/", 1)[-1], "I"),
                first_author_scope.get(wid.rsplit("/", 1)[-1], "N"),
            ])
    per_query[q] = n

payload = {"dicts": dicts, "data": rows}
with open(OUT_JSON, "w", encoding="utf-8") as f:
    json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
with open(OUT_JS, "w", encoding="utf-8") as f:
    f.write("const dashboardDataRaw = ")
    json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")

print(f"{len(rows)} obras únicas (novas por busca: {per_query})")
print({k: len(v) for k, v in dicts.items()})
print(f"dashboard_data.js: {os.path.getsize(OUT_JS)/1e6:.1f} MB")


# Cache: o index.html referencia os arquivos com ?v=<hash do conteúdo>, para o
# navegador (e o GitHub Pages) baixarem a versão nova sempre que algo mudar.
def write_collection_meta():
    """collection_meta.js: data e contagens da coleta, lidos pela página de metodologia."""
    meta_path = os.path.join(HERE, "openalex_collection_meta.json")
    meta = {}
    if os.path.exists(meta_path):
        with open(meta_path, encoding="utf-8") as f:
            meta = json.load(f)
    with open(os.path.join(HERE, "collection_meta.js"), "w", encoding="utf-8") as f:
        f.write("const collectionMeta = ")
        json.dump(meta, f, ensure_ascii=False)
        f.write(";\n")


def stamp_asset_versions():
    for page in ("index.html", "metodologia.html"):
        page_path = os.path.join(HERE, page)
        if not os.path.exists(page_path):
            continue
        with open(page_path, encoding="utf-8") as f:
            html = f.read()
        for asset in ("styles.css", "dashboard_data.js", "app.js", "collection_meta.js"):
            with open(os.path.join(HERE, asset), "rb") as f:
                digest = hashlib.sha1(f.read()).hexdigest()[:10]
            html = re.sub(re.escape(asset) + r"\?v=[^\"']*", f"{asset}?v={digest}", html)
        with open(page_path, "w", encoding="utf-8") as f:
            f.write(html)
    print("Versões em index.html e metodologia.html atualizadas (cache).")


write_collection_meta()
stamp_asset_versions()
