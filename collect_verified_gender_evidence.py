"""Create a DOI-level audit trail from public ORCID-to-Wikidata evidence.

Only binary P21 statements with a cited Wikidata claim are retained because the
dashboard currently supports only FEMININO/MASCULINO/INDEFINIDO.  This script
does not infer gender from a name, photograph, or publication text.
"""

import json
import time
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
CROSSREF_PATH = ROOT / "crossref_author_metadata.json"
OUTPUT_PATH = ROOT / "verified_gender_evidence.json"
WIKIDATA_API = "https://www.wikidata.org/w/api.php"
P21_TO_DASHBOARD_GENDER = {
    "Q6581072": "FEMININO",  # female
    "Q6581097": "MASCULINO",  # male
}


def get_json(params):
    url = f"{WIKIDATA_API}?{urlencode(params)}"
    request = Request(url, headers={"User-Agent": "OceanVegaDashboard/1.0 (metadata verification)"})
    with urlopen(request, timeout=20) as response:
        return json.load(response)


def wikidata_entity_for_orcid(orcid):
    bare_orcid = orcid.rsplit("/", 1)[-1]
    search = get_json({
        "action": "query",
        "list": "search",
        "srsearch": f'haswbstatement:P496={bare_orcid}',
        "format": "json",
    })
    results = search.get("query", {}).get("search", [])
    return results[0]["title"] if results else ""


def cited_binary_gender(entity_id):
    entity = get_json({"action": "wbgetentities", "ids": entity_id, "props": "claims", "format": "json"})
    statements = entity.get("entities", {}).get(entity_id, {}).get("claims", {}).get("P21", [])
    for statement in statements:
        value = statement.get("mainsnak", {}).get("datavalue", {}).get("value", {}).get("id")
        if value in P21_TO_DASHBOARD_GENDER and statement.get("references"):
            return P21_TO_DASHBOARD_GENDER[value]
    return ""


def main():
    crossref = json.loads(CROSSREF_PATH.read_text(encoding="utf-8"))
    evidence = {}
    seen_orcids = {}

    for doi, record in crossref.items():
        orcid = record.get("orcid", "")
        if not orcid:
            continue
        if orcid not in seen_orcids:
            try:
                entity_id = wikidata_entity_for_orcid(orcid)
                gender = cited_binary_gender(entity_id) if entity_id else ""
                seen_orcids[orcid] = (entity_id, gender)
            except Exception:
                seen_orcids[orcid] = ("", "")
            time.sleep(0.1)

        entity_id, gender = seen_orcids[orcid]
        if gender:
            evidence[doi] = {
                "gender": gender,
                "orcid": orcid,
                "wikidata_entity": entity_id,
                "source": f"https://www.wikidata.org/wiki/{entity_id}",
            }

    OUTPUT_PATH.write_text(json.dumps(evidence, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Verified DOI-level gender evidence: {len(evidence)}")


if __name__ == "__main__":
    main()
