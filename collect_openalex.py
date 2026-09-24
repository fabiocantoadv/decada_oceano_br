#!/usr/bin/env python3
"""
Coleta os dados brutos do OpenAlex para o OceanVega.

Reproduz a consulta OQL do projeto:

  works where year >= 2018 and country is BR and type is (article or review)
  and ( title/abstract has ( (termos de mar/oceano) and (termos ambientais/sociais) )
        or subfield is (1910 or 2212) )

A API de filtros não aceita OR entre filtros diferentes, então a consulta é
dividida em duas buscas, e os resultados são unidos e deduplicados pelo ID
do OpenAlex:

  1. "textual":   title_and_abstract.search = (MAR) AND (TEMA)
  2. "subfields": primary_topic.subfield.id = 1910 (Oceanography) | 2212 (Ocean Engineering)

Saídas (na pasta do script):
  openalex_raw/<consulta>.jsonl  — registros brutos, uma obra por linha (retomável)
  openalex_merged.json           — lista JSON unificada, lida por build_dashboard_data.py
  openalex_collection_meta.json  — data da coleta, filtros usados e contagens

Uso:
  python3 collect_openalex.py --count    # só mostra quantos registros cada busca retorna
  python3 collect_openalex.py            # coleta completa (retoma se interrompida)
  python3 collect_openalex.py --fresh    # descarta coleta parcial e recomeça

Variáveis de ambiente opcionais:
  OPENALEX_API_KEY  chave gratuita do OpenAlex (recomendada; https://openalex.org/settings/api)
  OPENALEX_MAILTO   e-mail de contato enviado à API
"""
import argparse
import datetime as dt
import json
import os
import ssl
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

BASE_URL = "https://api.openalex.org/works"
HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "openalex_raw")
MERGED_PATH = os.path.join(HERE, "openalex_merged.json")
META_PATH = os.path.join(HERE, "openalex_collection_meta.json")

YEAR_FROM = 2018
COUNTRY = "BR"
TYPES = ["article", "review"]
SUBFIELDS = ["1910", "2212"]  # Oceanography, Ocean Engineering

MARINE_TERMS = [
    "mar", "marinho", "marinha", "marítimo", "oceano", "oceânico", "costeiro",
    "offshore", "sea", "marine", "maritime", "ocean", "oceanic", "coastal",
]
THEME_TERMS = [
    '"meio ambiente"', "ambiental", "peixes", "espécies", "fauna", "biodiversidade",
    "recifes", "corais", "comunidades", "pescadores", "ribeirinhos", "populações",
    "preservação", "conservação", "poluição", "aquecimento", '"mudanças climáticas"',
    '"desenvolvimento sustentável"', '"economia azul"', '"currículo azul"',
    '"carbono azul"', '"escolas azuis"', "areia",
    "environment", "environmental", "fish", "species", "biodiversity", "reefs",
    "corals", "communities", "fishers", "riverside", "populations", "preservation",
    "conservation", "pollution", "warming", '"climate change"',
    '"sustainable development"', '"blue economy"', '"blue curriculum"',
    '"blue carbon"', '"blue schools"', "sand",
]


def _or_group(terms):
    seen, out = set(), []
    for t in terms:
        if t.lower() not in seen:
            seen.add(t.lower())
            out.append(t)
    return "(" + " OR ".join(out) + ")"


SEARCH_EXPR = f"{_or_group(MARINE_TERMS)} AND {_or_group(THEME_TERMS)}"

BASE_FILTER = ",".join([
    f"publication_year:>{YEAR_FROM - 1}",
    f"authorships.countries:{COUNTRY}",
    "type:" + "|".join(TYPES),
])

QUERIES = {
    "textual": {"filter": f"{BASE_FILTER},title_and_abstract.search:{SEARCH_EXPR}"},
    "subfields": {"filter": f"{BASE_FILTER},primary_topic.subfield.id:" + "|".join(SUBFIELDS)},
}


def _ssl_context():
    try:
        import certifi  # evita CERTIFICATE_VERIFY_FAILED no Python do python.org no macOS
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()


SSL_CTX = _ssl_context()


def api_get(params, retries=8):
    params = dict(params)
    if os.environ.get("OPENALEX_API_KEY"):
        params["api_key"] = os.environ["OPENALEX_API_KEY"]
    if os.environ.get("OPENALEX_MAILTO"):
        params["mailto"] = os.environ["OPENALEX_MAILTO"]
    url = BASE_URL + "?" + urllib.parse.urlencode(params, safe=":,|>")
    req = urllib.request.Request(url, headers={"User-Agent": "oceanvega-collector/1.0"})
    delay = 2
    for attempt in range(1, retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=90, context=SSL_CTX) as resp:
                return json.load(resp)
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")[:500]
            if e.code in (429, 500, 502, 503, 504) and attempt < retries:
                wait = int(e.headers.get("Retry-After") or delay)
                print(f"    HTTP {e.code}; nova tentativa em {wait}s...", flush=True)
                time.sleep(wait)
                delay = min(delay * 2, 120)
                continue
            sys.exit(f"Erro HTTP {e.code} da API do OpenAlex:\n{body}")
        except (urllib.error.URLError, TimeoutError, ConnectionError) as e:
            if attempt < retries:
                print(f"    Falha de rede ({e}); nova tentativa em {delay}s...", flush=True)
                time.sleep(delay)
                delay = min(delay * 2, 120)
                continue
            raise


def count(name):
    data = api_get({"filter": QUERIES[name]["filter"], "per-page": 1, "select": "id"})
    return data["meta"]["count"]


def collect(name, fresh=False):
    os.makedirs(RAW_DIR, exist_ok=True)
    out_path = os.path.join(RAW_DIR, f"{name}.jsonl")
    state_path = os.path.join(RAW_DIR, f"{name}.state.json")
    if fresh:
        for p in (out_path, state_path):
            if os.path.exists(p):
                os.remove(p)

    state = {"cursor": "*", "fetched": 0, "done": False}
    if os.path.exists(state_path):
        with open(state_path, encoding="utf-8") as f:
            state = json.load(f)
        # Descarta linhas gravadas depois do último checkpoint.
        if os.path.exists(out_path):
            with open(out_path, encoding="utf-8") as f:
                lines = f.readlines()[: state["fetched"]]
            with open(out_path, "w", encoding="utf-8") as f:
                f.writelines(lines)
    if state["done"]:
        print(f"[{name}] já concluída ({state['fetched']} registros).")
        return state["fetched"]

    total = None
    with open(out_path, "a", encoding="utf-8") as out:
        while state["cursor"]:
            data = api_get({
                "filter": QUERIES[name]["filter"],
                "per-page": 200,
                "cursor": state["cursor"],
            })
            total = data["meta"]["count"]
            results = data.get("results") or []
            for w in results:
                out.write(json.dumps(w, ensure_ascii=False) + "\n")
            out.flush()
            state["fetched"] += len(results)
            state["cursor"] = data["meta"].get("next_cursor") if results else None
            with open(state_path, "w", encoding="utf-8") as f:
                json.dump(state, f)
            print(f"[{name}] {state['fetched']}/{total}", flush=True)
    state["done"] = True
    with open(state_path, "w", encoding="utf-8") as f:
        json.dump(state, f)
    return state["fetched"]


def merge():
    seen = set()
    per_query = {}
    tmp = MERGED_PATH + ".tmp"
    with open(tmp, "w", encoding="utf-8") as out:
        out.write("[\n")
        first = True
        for name in QUERIES:
            path = os.path.join(RAW_DIR, f"{name}.jsonl")
            n = 0
            with open(path, encoding="utf-8") as f:
                for line in f:
                    if not line.strip():
                        continue
                    n += 1
                    w = json.loads(line)
                    if w.get("id") in seen:
                        continue
                    seen.add(w.get("id"))
                    out.write(("" if first else ",\n") + json.dumps(w, ensure_ascii=False))
                    first = False
            per_query[name] = n
        out.write("\n]\n")
    os.replace(tmp, MERGED_PATH)
    return per_query, len(seen)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--count", action="store_true", help="só mostra as contagens de cada busca")
    ap.add_argument("--fresh", action="store_true", help="recomeça do zero, descartando coleta parcial")
    args = ap.parse_args()

    if not os.environ.get("OPENALEX_API_KEY"):
        print("Aviso: OPENALEX_API_KEY não definida; a API pode limitar as requisições.\n")

    counts = {name: count(name) for name in QUERIES}
    for name, c in counts.items():
        print(f"{name}: {c} registros")
    if args.count:
        return

    started = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    for name in QUERIES:
        collect(name, fresh=args.fresh)
    per_query, unique = merge()

    meta = {
        "collected_at": started,
        "finished_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "source": BASE_URL,
        "queries": {n: q["filter"] for n, q in QUERIES.items()},
        "api_counts_at_start": counts,
        "records_per_query": per_query,
        "unique_records": unique,
    }
    with open(META_PATH, "w", encoding="utf-8") as f:
        json.dump(meta, f, ensure_ascii=False, indent=2)
    print(f"\nPronto: {unique} obras únicas em {os.path.basename(MERGED_PATH)}")


if __name__ == "__main__":
    main()
