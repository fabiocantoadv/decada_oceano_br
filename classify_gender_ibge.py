#!/usr/bin/env python3
"""
Classificação de gênero dos autores com base EXCLUSIVAMENTE nos nomes do IBGE
(Censo 2010), na versão processada pelo Brasil.IO (genero-nomes/nomes.csv.gz).

Regra (determinística, por primeiro nome):
  1. Primeiro nome = primeiro termo do nome do autor no OpenAlex, sem acentos,
     em maiúsculas; nomes compostos com hífen usam a primeira parte
     (Jean-Pierre -> JEAN).
  2. Se o primeiro termo for uma inicial (ex.: "D.", "A", "J.C."), o autor fica
     INDEFINIDO: não se usa o segundo nome para não trocar a pessoa de referência.
  3. O nome é buscado no IBGE. É classificado como FEMININO ou MASCULINO se
     a proporção do sexo predominante for >= LIMIAR (padrão 0,90) e o nome tiver
     ao menos MIN_FREQ pessoas registradas; caso contrário, INDEFINIDO.
  4. Nomes ausentes do IBGE ficam INDEFINIDOS (não há outra fonte).

Não se usam fotos, textos, IA generativa nem outras bases de nomes. O resultado é
uma previsão estatística a partir do nome, não uma autodeclaração de gênero.

Uso:
  python3 classify_gender_ibge.py --ibge ~/Downloads/genero/nomes.csv   (ou .csv.gz)
Saídas (pasta genero_ibge/):
  autores_genero_ibge.csv   — um autor por linha (ID OpenAlex, nome, 1º nome,
                              gênero, proporção do sexo predominante, proporção
                              feminina no IBGE, frequência no IBGE, motivo, países)
  obras_primeiro_autor.csv  — uma obra por linha com o gênero do 1º autor
  resumo.json               — contagens e parâmetros usados
"""
import argparse
import csv
import gzip
import io
import json
import os
import re
import unicodedata
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "openalex_raw")
QUERIES = ["textual", "subfields"]
OUT_DIR = os.path.join(HERE, "genero_ibge")


def norm(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.upper()


def first_name(full):
    """Primeiro nome normalizado, ou None se o primeiro termo for inicial/ausente."""
    if not full:
        return None
    tok = full.strip().split()[0] if full.strip() else ""
    tok = tok.split("-")[0].strip(",;")
    if tok.endswith(".") or "." in tok:
        return None
    tok = norm(tok)
    tok = re.sub(r"[^A-Z]", "", tok)
    if len(tok) < 2:
        return None
    return tok


def load_ibge(path):
    """Lê o nomes.csv(.gz) do Brasil.IO -> {NOME: (freq_f, freq_m)}.
    Usa só a coluna first_name: alternative_names lista as grafias do *grupo*
    do nome (com frequências próprias em outras linhas), não sinônimos exatos."""
    opener = gzip.open if path.endswith(".gz") else open
    names = {}
    with opener(path, "rt", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        need = {"first_name", "frequency_female", "frequency_male"}
        if not need <= set(reader.fieldnames or []):
            raise SystemExit(f"Colunas inesperadas no arquivo do IBGE: {reader.fieldnames}")
        for r in reader:
            k = re.sub(r"[^A-Z]", "", norm(r["first_name"]))
            if not k:
                continue
            ff = int(float(r["frequency_female"] or 0))
            fm = int(float(r["frequency_male"] or 0))
            pf, pm = names.get(k, (0, 0))
            names[k] = (pf + ff, pm + fm)
    return names


def female_share(fn, ibge):
    """Proporção feminina do nome no IBGE (None se o nome não estiver na base)."""
    if fn is None or fn not in ibge:
        return None
    ff, fm = ibge[fn]
    return ff / (ff + fm) if (ff + fm) else None


def classify(fn, ibge, threshold, min_freq):
    if fn is None:
        return "INDEFINIDO", None, 0, "nome abreviado"
    if fn not in ibge:
        return "INDEFINIDO", None, 0, "nome ausente do IBGE"
    ff, fm = ibge[fn]
    total = ff + fm
    if total < min_freq:
        return "INDEFINIDO", None, total, "frequência baixa no IBGE"
    ratio_f = ff / total
    if ratio_f >= threshold:
        return "FEMININO", ratio_f, total, "IBGE"
    if (1 - ratio_f) >= threshold:
        return "MASCULINO", 1 - ratio_f, total, "IBGE"
    return "INDEFINIDO", max(ratio_f, 1 - ratio_f), total, "nome ambíguo no IBGE"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ibge", required=True, help="caminho do nomes.csv.gz do Brasil.IO")
    ap.add_argument("--limiar", type=float, default=0.90, help="proporção mínima do sexo predominante (padrão 0,90)")
    ap.add_argument("--min-freq", type=int, default=20, help="mínimo de pessoas com o nome no IBGE (padrão 20)")
    args = ap.parse_args()

    ibge = load_ibge(os.path.expanduser(args.ibge))
    print(f"IBGE: {len(ibge):,} grafias de nomes carregadas")

    os.makedirs(OUT_DIR, exist_ok=True)
    authors = {}         # id -> dict
    works = []
    seen = set()
    for q in QUERIES:
        with open(os.path.join(RAW_DIR, f"{q}.jsonl"), encoding="utf-8") as f:
            for line in f:
                w = json.loads(line)
                if w["id"] in seen:
                    continue
                seen.add(w["id"])
                first = None
                for pos, a in enumerate(w.get("authorships") or []):
                    au = a.get("author") or {}
                    name = (au.get("display_name") or a.get("raw_author_name") or "").strip()
                    aid = au.get("id") or f"sem-id:{w['id'].rsplit('/', 1)[-1]}:{pos}"
                    if aid not in authors:
                        fn = first_name(name)
                        g, p, tot, motivo = classify(fn, ibge, args.limiar, args.min_freq)
                        authors[aid] = {
                            "author_id": aid.rsplit("/", 1)[-1], "nome": name, "primeiro_nome": fn or "",
                            "genero": g, "proporcao": f"{p:.4f}" if p is not None else "",
                            "prop_feminina_ibge": (lambda x: f"{x:.4f}" if x is not None else "")(female_share(fn, ibge)),
                            "freq_ibge": tot, "motivo": motivo, "paises": set(), "obras": 0,
                        }
                    authors[aid]["obras"] += 1
                    authors[aid]["paises"].update(a.get("countries") or [])
                    if pos == 0:
                        first = (aid, name, a.get("countries") or [])
                wid = w["id"].rsplit("/", 1)[-1]
                if first:
                    aid, name, ctry = first
                    works.append({"work_id": wid, "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
                                  "ano": w.get("publication_year"), "primeiro_autor": name,
                                  "author_id": aid.rsplit("/", 1)[-1], "genero_primeiro_autor": authors[aid]["genero"],
                                  "primeiro_autor_no_brasil": "BR" in ctry,
                                  "paises_primeiro_autor": ";".join(sorted(set(ctry)))})
                else:
                    works.append({"work_id": wid, "doi": (w.get("doi") or "").replace("https://doi.org/", ""),
                                  "ano": w.get("publication_year"), "primeiro_autor": "", "author_id": "",
                                  "genero_primeiro_autor": "INDEFINIDO", "primeiro_autor_no_brasil": False,
                                  "paises_primeiro_autor": ""})

    with open(os.path.join(OUT_DIR, "autores_genero_ibge.csv"), "w", newline="", encoding="utf-8") as f:
        cols = ["author_id", "nome", "primeiro_nome", "genero", "proporcao", "prop_feminina_ibge",
                "freq_ibge", "motivo", "paises", "obras"]
        wr = csv.DictWriter(f, fieldnames=cols)
        wr.writeheader()
        for a in authors.values():
            wr.writerow({**a, "paises": ";".join(sorted(a["paises"]))})
    with open(os.path.join(OUT_DIR, "obras_primeiro_autor.csv"), "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=list(works[0].keys()))
        wr.writeheader()
        wr.writerows(works)

    ga = Counter(a["genero"] for a in authors.values())
    gm = Counter(a["motivo"] for a in authors.values())
    gw = Counter(w["genero_primeiro_autor"] for w in works)
    gw_br = Counter(w["genero_primeiro_autor"] for w in works if w["primeiro_autor_no_brasil"])
    resumo = {
        "fonte": "IBGE Censo 2010 via Brasil.IO genero-nomes (nomes.csv.gz)",
        "parametros": {"limiar": args.limiar, "min_freq": args.min_freq},
        "autores": {"total": len(authors), "por_genero": ga, "por_motivo": gm},
        "obras_primeiro_autor": {"total": len(works), "por_genero": gw},
        "obras_primeiro_autor_no_brasil": {"total": sum(gw_br.values()), "por_genero": gw_br},
    }
    with open(os.path.join(OUT_DIR, "resumo.json"), "w", encoding="utf-8") as f:
        json.dump(resumo, f, ensure_ascii=False, indent=2)
    print(json.dumps(resumo, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
