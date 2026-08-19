"""Collect public Crossref author identifiers for unresolved dashboard records.

This script records bibliographic metadata only. It deliberately makes no gender
classification; that remains restricted to evidence already available in the
dashboard pipeline.
"""

import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
DATA_PATH = ROOT / "dashboard_data.json"
CACHE_PATH = ROOT / "crossref_author_metadata.json"
MAX_WORKERS = 4


def doi_from_link(link):
    if not isinstance(link, str):
        return ""
    marker = "doi.org/"
    return link.lower().split(marker, 1)[1] if marker in link.lower() else ""


def fetch(doi):
    request = Request(
        f"https://api.crossref.org/works/{quote(doi, safe='')}",
        headers={"User-Agent": "OceanVegaDashboard/1.0 (bibliographic metadata enrichment)"},
    )
    try:
        with urlopen(request, timeout=20) as response:
            message = json.load(response).get("message", {})
        authors = message.get("author") or []
        first = authors[0] if authors else {}
        return doi, {
            "given": first.get("given", ""),
            "family": first.get("family", ""),
            "orcid": first.get("ORCID", ""),
            "source": "Crossref",
        }
    except (HTTPError, URLError, TimeoutError, ValueError) as error:
        return doi, {"error": type(error).__name__, "source": "Crossref"}


def main():
    payload = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    genders = payload["dicts"]["genders"]
    unresolved = {
        doi_from_link(row[15])
        for row in payload["data"]
        if genders[row[3]] == "INDEFINIDO" and doi_from_link(row[15])
    }

    cache = json.loads(CACHE_PATH.read_text(encoding="utf-8")) if CACHE_PATH.exists() else {}
    pending = sorted(unresolved - set(cache))
    print(f"Crossref metadata: {len(unresolved)} DOIs unresolved; {len(pending)} pending.")

    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = [executor.submit(fetch, doi) for doi in pending]
        for completed, future in enumerate(as_completed(futures), start=1):
            doi, record = future.result()
            cache[doi] = record
            if completed % 50 == 0 or completed == len(pending):
                CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")
                print(f"  Saved {completed}/{len(pending)}")
            time.sleep(0.05)

    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
