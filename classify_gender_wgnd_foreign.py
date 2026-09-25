#!/usr/bin/env python3
"""
Etapa 2 da classificação de gênero: autores com afiliação exclusivamente
estrangeira, classificados pelo World Gender Name Dictionary 2.0 (WGND 2.0,
WIPO; Harvard Dataverse, doi:10.7910/DVN/MSEGSJ) conforme o país de afiliação.
Roda depois de classify_gender_ibge.py. O painel usa a coluna genero_wgnd
(somente por país, sem o fallback) para esses autores; os demais seguem o IBGE.

Regra:
  1. Primeiro nome extraído como em classify_gender_ibge.py (iniciais -> indefinido).
  2. Para cada país de afiliação do autor, busca (nome, país) no arquivo
     wgnd_2_0_name-gender-code.csv. A proporção de cada gênero (wgt) inclui a
     parcela "?" (incerto) do WGND.
  3. O país "vota" F ou M se esse gênero tiver wgt >= LIMIAR (padrão 0,90);
     senão, o país é "ambíguo".
  4. Autor classificado se todos os países com dado votarem no mesmo gênero;
     se discordarem ou algum for ambíguo -> "ambíguo"; sem dado -> "ausente".
  5. Variante com fallback: se o nome não existir para nenhum país do autor,
     usa o arquivo sem país (wgnd_2_0_name-gender_nocode.csv) quando o nome
     tiver um único gênero lá.

Uso:
  python3 classify_gender_wgnd_foreign.py --wgnd ~/Downloads/dataverse_files
Saídas em genero_wgnd/:
  autores_estrangeiros_wgnd.csv  — autor, países, 1º nome, gênero IBGE (atual),
                                   gênero WGND (por país) e com fallback, detalhe
  resumo_wgnd.json               — contagens e comparação com o IBGE
"""
import argparse
import csv
import json
import os
import re
import unicodedata
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
IBGE_CSV = os.path.join(HERE, "genero_ibge", "autores_genero_ibge.csv")
OUT_DIR = os.path.join(HERE, "genero_wgnd")


def norm(s):
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    return re.sub(r"[^a-z]", "", s)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--wgnd", required=True, help="pasta com os arquivos da WGND 2.0")
    ap.add_argument("--limiar", type=float, default=0.90)
    args = ap.parse_args()
    wdir = os.path.expanduser(args.wgnd)

    # Autores só com afiliação estrangeira (ao menos um país e nenhum BR)
    authors = []
    with open(IBGE_CSV, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            paises = [p for p in r["paises"].split(";") if p]
            if paises and "BR" not in paises:
                r["paises_l"] = paises
                r["fn"] = norm(r["primeiro_nome"]) if r["primeiro_nome"] else ""
                authors.append(r)
    wanted = {a["fn"] for a in authors if a["fn"]}
    print(f"Autores só estrangeiros: {len(authors):,} | primeiros nomes distintos: {len(wanted):,}")

    # WGND por (nome, país): {gênero: wgt}; prefere a grafia sem acento
    by_code = defaultdict(lambda: defaultdict(dict))  # (fn, code) -> {grafia: {g: wgt}}
    with open(os.path.join(wdir, "wgnd_2_0_name-gender-code.csv"), encoding="utf-8", errors="replace") as f:
        rd = csv.reader(f)
        next(rd)
        for row in rd:
            if len(row) < 4:
                continue
            raw, code, g, w = row[0], row[1], row[2], row[3]
            k = norm(raw)
            if k in wanted:
                try:
                    by_code[(k, code.upper())][raw][g] = float(w)
                except ValueError:
                    pass
    wgnd = {}
    for key, variants in by_code.items():
        pick = next((v for raw, v in variants.items() if raw == key[0]), None)
        wgnd[key] = pick or next(iter(variants.values()))

    nocode = defaultdict(set)
    with open(os.path.join(wdir, "wgnd_2_0_name-gender_nocode.csv"), encoding="utf-8", errors="replace") as f:
        rd = csv.reader(f)
        next(rd)
        for row in rd:
            if len(row) >= 2:
                k = norm(row[0])
                if k in wanted:
                    nocode[k].add(row[1])

    def classify(fn, paises):
        if not fn:
            return "INDEFINIDO", "nome abreviado", ""
        votes, detail = [], []
        for c in paises:
            d = wgnd.get((fn, c))
            if not d:
                continue
            if d.get("F", 0) >= args.limiar:
                v = "F"
            elif d.get("M", 0) >= args.limiar:
                v = "M"
            else:
                v = "?"
            votes.append(v)
            detail.append(f"{c}:" + "/".join(f"{g}{d[g]:.2f}" for g in sorted(d)))
        if not votes:
            return "INDEFINIDO", "nome ausente na WGND para o país", ""
        if set(votes) == {"F"}:
            return "FEMININO", "WGND", "; ".join(detail)
        if set(votes) == {"M"}:
            return "MASCULINO", "WGND", "; ".join(detail)
        return "INDEFINIDO", "nome ambíguo na WGND", "; ".join(detail)

    os.makedirs(OUT_DIR, exist_ok=True)
    rows = []
    for a in authors:
        g, motivo, detail = classify(a["fn"], a["paises_l"])
        g_fb, motivo_fb = g, motivo
        if motivo == "nome ausente na WGND para o país" and a["fn"] in nocode:
            gs = nocode[a["fn"]] - {"?"}
            if len(gs) == 1 and "?" not in nocode[a["fn"]]:
                g_fb = {"F": "FEMININO", "M": "MASCULINO"}[gs.pop()]
                motivo_fb = "WGND sem país (fallback)"
            else:
                motivo_fb = "nome ambíguo na WGND (sem país)"
        rows.append({
            "author_id": a["author_id"], "nome": a["nome"], "paises": ";".join(a["paises_l"]),
            "primeiro_nome": a["primeiro_nome"], "obras": a["obras"],
            "genero_ibge": a["genero"], "motivo_ibge": a["motivo"],
            "genero_wgnd": g, "motivo_wgnd": motivo,
            "genero_wgnd_fallback": g_fb, "motivo_wgnd_fallback": motivo_fb,
            "detalhe_wgnd": detail,
        })

    with open(os.path.join(OUT_DIR, "autores_estrangeiros_wgnd.csv"), "w", newline="", encoding="utf-8") as f:
        wr = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        wr.writeheader()
        wr.writerows(rows)

    cmp = Counter((r["genero_ibge"], r["genero_wgnd"]) for r in rows)
    resumo = {
        "fonte": "WGND 2.0 (WIPO), wgnd_2_0_name-gender-code.csv; fallback: wgnd_2_0_name-gender_nocode.csv",
        "limiar": args.limiar,
        "autores_estrangeiros": len(rows),
        "ibge": Counter(r["genero_ibge"] for r in rows),
        "wgnd_por_pais": Counter(r["genero_wgnd"] for r in rows),
        "wgnd_por_pais_motivos": Counter(r["motivo_wgnd"] for r in rows),
        "wgnd_com_fallback": Counter(r["genero_wgnd_fallback"] for r in rows),
        "ibge_x_wgnd": {f"{a}->{b}": n for (a, b), n in sorted(cmp.items())},
    }
    with open(os.path.join(OUT_DIR, "resumo_wgnd.json"), "w", encoding="utf-8") as f:
        json.dump(resumo, f, ensure_ascii=False, indent=2)
    print(json.dumps(resumo, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
