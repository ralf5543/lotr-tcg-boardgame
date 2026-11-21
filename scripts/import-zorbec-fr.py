#!/usr/bin/env python3
"""
Importe les traductions FR depuis Decklist Builder (CardList.dat de Zorbec)
vers src/lotro_card_data.csv, en convertissant le markup Zorbec vers nos balises.

Ne remplace le French Text / Title / Subtitle que s'ils sont vides ou encore
identiques à la VO (copie EN). Préserve le nombre de colonnes CSV.
"""

from __future__ import annotations

import csv
import re
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DAT = ROOT / "public" / "CardList.dat"
CSV_PATH = ROOT / "src" / "lotro_card_data.csv"

CULTURE = {
    "gon": "gondor",
    "roh": "rohan",
    "sau": "sauron",
    "men": "men",
    "orc": "orc",
    "elv": "elven",
    "rin": "wraith",
    "ise": "isengard",
    "gan": "gandalf",
    "uruk": "urukhai",
    "dwa": "dwarven",
    "rai": "raider",
    "shi": "shire",
    "mor": "moria",
    "dun": "dunland",
    "gol": "gollum",
    "Gon": "gondor",
    "Dwa": "dwarven",
    "Ise": "isengard",
    "Roh": "rohan",
    "Sau": "sauron",
    "Sauron": "sauron",
}

# Phases / libellés souvent suivis de :[bold] chez Zorbec
PHASE_LABEL = re.compile(
    r"(?P<label>"
    r"Response|Maneuver|Skirmish|Archery|Regroup|Fellowship|Shadow|"
    r"Assignment|Special|Response\s*:|Maneuver\s*:|"
    # FR
    r"Réponse|Reponse|Manœuvre|Manoeuvre|Combat|Archerie|Ralliement|"
    r"Compagnie|Ombre|Affectation|Spécial|Special"
    r")"
    r"\s*:\s*\[bold\]",
    re.IGNORECASE,
)

NO_FR_MARKER = "Il n'existe pas de version française"


def norm_title(s: str) -> str:
    """Compare titres VO malgré apostrophes / espaces / tirets fragiles."""
    s = (s or "").strip().lower()
    for a, b in (
        ("\u2019", "'"),
        ("\u2018", "'"),
        ("\u0092", "'"),  # cp1252 curly via latin-1 mojibake
        ("´", "'"),
        ("`", "'"),
        ("â\x80\x99", "'"),
        ("-", " "),
        ("–", " "),
        ("—", " "),
        ("!", ""),
        ("?", ""),
        (".", ""),
        (",", ""),
    ):
        s = s.replace(a, b)
    s = s.replace("'", "'")
    # collapse spaces
    s = re.sub(r"\s+", " ", s).strip()
    return s


def load_zorbec(
    path: Path,
) -> tuple[
    dict[str, dict[str, str]],
    dict[tuple[str, str, str], list[dict[str, str]]],
]:
    raw = path.read_bytes()
    if raw[:5] != b"ZDBDB":
        raise SystemExit(f"Format inattendu: {path}")
    desc_len = struct.unpack_from("<I", raw, 5)[0]
    off = 9 + desc_len
    payload = raw[off + 4 :]
    text = zlib.decompress(payload).decode("cp1252")
    lines = text.splitlines()
    headers = lines[0].split("\t")
    by_id: dict[str, dict[str, str]] = {}
    by_set_title: dict[tuple[str, str, str], list[dict[str, str]]] = {}
    for line in lines[1:]:
        if not line.strip():
            continue
        parts = line.split("\t")
        row = {
            h: (parts[i] if i < len(parts) else "")
            for i, h in enumerate(headers)
        }
        try:
            num = str(int(row["Number"]))
        except ValueError:
            num = row["Number"]
        key = f"{row['Serie']}{row['Rarity']}{num}"
        by_id[key] = row
        zid = (row.get("ID") or "").strip()
        if zid:
            by_id.setdefault(zid, row)
        title_key = norm_title(row.get("Title US") or "")
        sub_key = norm_title(row.get("Subtitle US") or "")
        if title_key:
            by_set_title.setdefault((row["Serie"], title_key, sub_key), []).append(row)
            # Aussi index sans sous-titre pour recherche large
            by_set_title.setdefault((row["Serie"], title_key, "*"), []).append(row)
    return by_id, by_set_title


def resolve_zorbec(
    row: dict[str, str],
    by_id: dict[str, dict[str, str]],
    by_set_title: dict[tuple[str, str, str], list[dict[str, str]]],
) -> dict[str, str] | None:
    """Match : Collectors Info d'abord (faute CSV / sous-titre OK), sinon set+titre."""
    key = (row.get("Collectors Info") or "").strip()
    our_title = norm_title(row.get("Title") or "")
    our_sub = norm_title(row.get("Subtitle") or "")
    z = by_id.get(key)
    if z:
        # Même id catalogue = même carte (ex. Masster/Master, Conquerer/Conqueror).
        return z

    serie = (row.get("Set") or "").strip()
    # 1) set + titre + sous-titre
    cands = by_set_title.get((serie, our_title, our_sub)) or []
    if len(cands) == 1:
        return cands[0]
    if len(cands) > 1:
        # départage par rareté + numéro si possible
        rarity = (row.get("Rarity") or "").strip()
        number = (row.get("Number") or "").strip().lstrip("0") or "0"
        for c in cands:
            try:
                zn = str(int(c.get("Number") or "0"))
            except ValueError:
                zn = (c.get("Number") or "").strip()
            if (c.get("Rarity") or "") == rarity and zn == number:
                return c
        return cands[0]

    # 2) set + titre seul, une seule carte
    cands = by_set_title.get((serie, our_title, "*")) or []
    # dédup par ID
    uniq: dict[str, dict[str, str]] = {}
    for c in cands:
        uniq[(c.get("ID") or id(c))] = c
    cands = list(uniq.values())
    if len(cands) == 1:
        return cands[0]
    if our_sub:
        sub_hits = [
            c for c in cands if norm_title(c.get("Subtitle US") or "") == our_sub
        ]
        if len(sub_hits) == 1:
            return sub_hits[0]
    return None


def zorbec_gametext_to_ours(text: str) -> str:
    """Convertit Gametext FR/US Zorbec → markup CSV (<keyword>, <symbol>, <br>, <i>)."""
    if not text or not text.strip():
        return ""

    s = text

    # Guillemets d'abilities copiées
    s = s.replace("[quote]", '"')

    # Point-virgule « de colonne » Zorbec → notre convention EN (;)
    s = s.replace("[comma]", "; ")

    # Retours ligne
    s = s.replace("[br]", "<br>")

    # Cultures
    for code, name in CULTURE.items():
        s = s.replace(f"[{code}]", f"<symbol>{name}</symbol>")

    # Coûts crépuscule [1]…[9] / [X]
    s = re.sub(
        r"\[([1-9Xx])\]",
        lambda m: f"<symbol>twilight{m.group(1).upper() if m.group(1) in 'xX' else m.group(1)}</symbol>",
        s,
    )
    s = s.replace("<symbol>twilightX</symbol>", "<symbol>twilightX</symbol>")

    # [norm]…[bold] → keyword inline
    s = re.sub(
        r"\[norm\](.*?)\[bold\]",
        lambda m: f"<keyword>{m.group(1).strip()}</keyword>",
        s,
        flags=re.DOTALL,
    )

    # Rappels entre parenthèses marqués italic : (… )[italic] ou [italic]…[italic]
    # Cas fréquent : (reminder text)[italic]
    s = re.sub(
        r"\(([^)]*)\)\[italic\]",
        lambda m: f"<i>({m.group(1)})</i>",
        s,
    )
    s = re.sub(
        r"\[italic\](.*?)\[italic\]",
        lambda m: f"<i>{m.group(1)}</i>",
        s,
        flags=re.DOTALL,
    )

    # Phase:[bold] → <keyword>Phase :</keyword> (conserve l'espace FR avant :)
    def phase_repl(m: re.Match) -> str:
        label = m.group("label")
        # Normalise un peu l'espace avant le deux-points pour le FR
        if re.search(
            r"[éèêàùâôîïçÉ]|Réponse|Manœuvre|Manoeuvre|Combat|Archerie|Ralliement|Compagnie|Ombre|Affectation",
            label,
        ):
            return f"<keyword>{label.strip()} :</keyword>"
        return f"<keyword>{label.strip()}:</keyword>"

    s = PHASE_LABEL.sub(phase_repl, s)

    # Ambush / Embuscade + coût : « Embuscade [bold]<symbol>twilightN</symbol>.[bold] »
    s = re.sub(
        r"(Ambush|Embuscade)\s*\[bold\]\s*(<symbol>twilight[^<]+</symbol>)\.?\[bold\]?",
        r"<keyword>\1</keyword> \2<keyword>.</keyword>",
        s,
        flags=re.IGNORECASE,
    )
    s = re.sub(
        r"(Ambush|Embuscade)\s*\[bold\]\s*(<symbol>twilight[^<]+</symbol>)\.",
        r"<keyword>\1</keyword> \2<keyword>.</keyword>",
        s,
        flags=re.IGNORECASE,
    )

    # Bloc de mots-clés en tête (ou après <br>) se terminant par [bold]
    # Ex: « Associé à l'Anneau. Rôdeur.[bold] » / « Lurker.[bold] »
    def keyword_block(m: re.Match) -> str:
        prefix = m.group("prefix") or ""
        block = m.group("block").strip()
        if not block:
            return prefix
        if "<keyword>" in block or "<symbol>" in block or "<i>" in block:
            return prefix + block
        parts = re.split(r"(?<=\.)\s+", block)
        parts = [p for p in parts if p]
        if not parts:
            return prefix
        wrapped = " ".join(
            f"<keyword>{p if p.endswith('.') else p}</keyword>" for p in parts
        )
        return prefix + wrapped

    s = re.sub(
        r"(?P<prefix>^|<br>\s*)(?P<block>[^<]{1,120}?)\[bold\]",
        keyword_block,
        s,
    )

    # Nettoyage balises Zorbec restantes
    s = s.replace("[bold]", "")
    s = s.replace("[head]", "")
    s = s.replace("[italic]", "")
    s = s.replace("[norm]", "")

    # Mots-clés orphelins restés avant un keyword/symbol déjà balisé
    # Ex: « Suderon. <keyword>Embuscade</keyword> » / « Rivière. <keyword>Ombre :</keyword> »
    s = re.sub(
        r"(^|<br>)((?:[^<]{1,80}?\.\s*)+)(?=<keyword>|<symbol>)",
        lambda m: m.group(1)
        + " ".join(
            f"<keyword>{p}</keyword>"
            for p in re.split(r"(?<=\.)\s+", m.group(2).strip())
            if p
        )
        + " ",
        s,
    )

    # Espaces autour des br / keywords
    s = re.sub(r"[ \t]+", " ", s)
    s = re.sub(r" ?<br> ?", "<br>", s)
    s = re.sub(r"<br>\s*", "<br>", s)
    s = s.replace(" </keyword>", "</keyword> ")
    s = re.sub(r" +", " ", s)
    s = s.strip()

    # Messages « pas de VF » → ne pas importer comme traduction
    if NO_FR_MARKER in s:
        return ""

    return s


def strip_markup(s: str) -> str:
    s = re.sub(r"<[^>]+>", "", s or "")
    s = re.sub(r"\s+", " ", s).strip().lower()
    s = re.sub(r"\.+", ".", s)
    return s


# Indices VO encore collés dans French Text (CSV LOTRO / import trop strict).
_EN_MARKERS = (
    "bearer must",
    "fellowship:",
    "shadow:",
    "skirmish:",
    "maneuver:",
    "response:",
    "regroup:",
    "assignment:",
    "while you can spot",
    "while you cannot",
    "while skirmishing",
    "to play,",
    "each time",
    "at the start",
    "discard ",
    "exert ",
    "wound ",
    "make him ",
    "make a ",
    "make gandalf",
    "make that",
    "this minion",
    "this companion",
    "this condition",
    "ring-bearer",
    "free peoples",
    "strength +",
    "damage +",
    "if you have initiative",
    "hunter ",
)
_FR_MARKERS = (
    "doit être",
    "compagnie",
    "ombre :",
    "ombre:",
    "combat :",
    "combat:",
    "manœuvre",
    "manoeuvre",
    "réponse",
    "reponse",
    "ralliement",
    "affectation",
    "défausse",
    "defausse",
    "blesse",
    "affaibl",
    "tant que",
    "pour jouer",
    "chaque fois",
    "au début",
    "vous pouvez",
    "séide",
    "seide",
    "compagnon",
    "détenteur",
    "detenteur",
    "repérez",
    "reperez",
    "découvrez",
    "decouvrez",
)


def is_english_copy(fr: str, en: str) -> bool:
    """Vrai si FR vide, = EN, = EN hors markup, ou encore clairement de la VO."""
    fr = (fr or "").strip()
    en = (en or "").strip()
    if not fr:
        return True
    if not en:
        return False
    if fr == en:
        return True
    if strip_markup(fr) == strip_markup(en):
        return True
    fr_l = strip_markup(fr)
    en_hits = sum(1 for m in _EN_MARKERS if m in fr_l)
    fr_hits = sum(1 for m in _FR_MARKERS if m in fr_l)
    # VO collée avec markup différent / légère reformulation EN
    if en_hits >= 1 and fr_hits == 0:
        return True
    return False


def main() -> None:
    by_id, by_set_title = load_zorbec(DAT)
    with CSV_PATH.open(newline="", encoding="latin-1") as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        if not fieldnames:
            raise SystemExit("CSV sans en-têtes")
        rows = list(reader)

    stats = {
        "matched": 0,
        "title": 0,
        "subtitle": 0,
        "text": 0,
        "skipped_keep_fr": 0,
        "no_zorb": 0,
        "no_fr_in_zorb": 0,
        "matched_via_title": 0,
    }
    samples: list[str] = []

    for row in rows:
        key = row.get("Collectors Info") or ""
        z = resolve_zorbec(row, by_id, by_set_title)
        if not z:
            stats["no_zorb"] += 1
            continue
        stats["matched"] += 1
        z_id = (z.get("ID") or "").strip()
        if z_id and z_id != key:
            stats["matched_via_title"] += 1

        en_title = (row.get("Title") or "").strip()
        en_sub = (row.get("Subtitle") or "").strip()
        en_text = (row.get("Text") or "").strip()
        fr_title = (row.get("French Title") or "").strip()
        fr_sub = (row.get("French Subtitle") or "").strip()
        fr_text = (row.get("French Text") or "").strip()

        z_title = (z.get("Title FR") or "").strip()
        z_sub = (z.get("Subtitle FR") or "").strip()
        z_gt = (z.get("Gametext FR") or "").strip()

        # Titre
        if z_title and is_english_copy(fr_title, en_title) and z_title != en_title:
            row["French Title"] = z_title
            stats["title"] += 1

        # Sous-titre
        if z_sub and is_english_copy(fr_sub, en_sub) and z_sub != en_sub:
            row["French Subtitle"] = z_sub
            stats["subtitle"] += 1

        # Gametext
        if en_text and is_english_copy(fr_text, en_text):
            converted = zorbec_gametext_to_ours(z_gt)
            if converted and converted != en_text:
                row["French Text"] = converted
                stats["text"] += 1
                if len(samples) < 8:
                    samples.append(
                        f"{key} {en_title}\n  EN: {en_text[:140]}\n  FR: {converted[:160]}"
                    )
            elif not converted:
                stats["no_fr_in_zorb"] += 1
        elif fr_text and fr_text != en_text:
            stats["skipped_keep_fr"] += 1

    # Écriture CSV : mêmes colonnes, quoting minimal, latin-1
    tmp = CSV_PATH.with_suffix(".csv.tmp")
    with tmp.open("w", newline="", encoding="latin-1", errors="replace") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
            lineterminator="\n",
            quoting=csv.QUOTE_MINIMAL,
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({h: row.get(h, "") for h in fieldnames})
    tmp.replace(CSV_PATH)

    print("Stats:", stats)
    print("\nÉchantillons:")
    for s in samples:
        print("-" * 60)
        print(s)


if __name__ == "__main__":
    main()
