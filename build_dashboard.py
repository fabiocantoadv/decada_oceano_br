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
  4 subárea         -> dicts.subareas      (primary_topic)
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
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "openalex_raw")
QUERIES = ["textual", "subfields"]
OUT_JSON = os.path.join(HERE, "dashboard_data.json")
OUT_JS = os.path.join(HERE, "dashboard_data.js")
COUNTRY_NAMES_CSV = os.path.join(HERE, "openalex_country_names.csv")

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
author_index = {}


def author_idx(aid, name, orcid):
    orcid = (orcid or "").rsplit("/", 1)[-1]
    if aid not in author_index:
        author_index[aid] = len(dicts["authors"])
        dicts["authors"].append(name or aid)
        dicts["author_orcids"].append(orcid)
    elif orcid and not dicts["author_orcids"][author_index[aid]]:
        dicts["author_orcids"][author_index[aid]] = orcid
    return author_index[aid]


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
                idx("subareas", get(w, "primary_topic", "display_name") or OTHER),
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
