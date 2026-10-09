#!/usr/bin/env python3
"""
Répare le markup structurel des gametexts non-EN du CSV :
- enveloppe les mots de phase nus (Ombre :, Shadow:, …) dans <keyword>…</keyword>
- insère <br> avant les <keyword> de phase quand l’EN en a et que la trad n’en a pas assez

N’altère pas le sens des traductions — seulement les balises / séparateurs.
"""
from __future__ import annotations

import csv
import re
from pathlib import Path

CSV_PATH = Path(__file__).resolve().parents[1] / "src" / "lotro_card_data.csv"

LANG_COLS = [
    "French Text",
    "German Text",
    "Italian Text",
    "Spanish Text",
]

# Mot de phase (+ ponctuation) → forme canonique dans <keyword>
PHASE_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    # FR
    (re.compile(r"(?<![>\w])(Ombre)\s*:", re.I), r"<keyword>\1 :</keyword>"),
    (re.compile(r"(?<![>\w])(Réponse|Reponse)\s*:", re.I), r"<keyword>\1 :</keyword>"),
    (re.compile(r"(?<![>\w])(Compagnie)\s*:", re.I), r"<keyword>\1 :</keyword>"),
    (re.compile(r"(?<![>\w])(Manœuvre|Manoeuvre)\s*:", re.I), r"<keyword>\1 :</keyword>"),
    (re.compile(r"(?<![>\w])(Archerie)\s*:", re.I), r"<keyword>\1 :</keyword>"),
    (re.compile(r"(?<![>\w])(Affectation)\s*:", re.I), r"<keyword>\1 :</keyword>"),
    (re.compile(r"(?<![>\w])(Combat)\s*:", re.I), r"<keyword>\1 :</keyword>"),
    (re.compile(r"(?<![>\w])(Ralliement)\s*:", re.I), r"<keyword>\1 :</keyword>"),
    # DE
    (re.compile(r"(?<![>\w])(Schatten)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Reaktion)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Gemeinschaft)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Manöver|Manoever)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Fernkampf)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Zuweisung)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Kampf)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Sammeln)\s*:", re.I), r"<keyword>\1:</keyword>"),
    # IT
    (re.compile(r"(?<![>\w])(Ombra)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Risposta)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Compagnia)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Manovra)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Tiro)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Assegnazione)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Schermaglia)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Raduno)\s*:", re.I), r"<keyword>\1:</keyword>"),
    # ES
    (re.compile(r"(?<![>\w])(Sombra)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Respuesta)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Comunidad)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Maniobra)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Arquería|Arqueria)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Asignación|Asignacion)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Escaramuza)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Reagrupamiento)\s*:", re.I), r"<keyword>\1:</keyword>"),
    # EN leftovers in non-EN cells
    (re.compile(r"(?<![>\w])(Shadow)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Response)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Fellowship)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Maneuver)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Archery)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Assignment)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Skirmish)\s*:", re.I), r"<keyword>\1:</keyword>"),
    (re.compile(r"(?<![>\w])(Regroup)\s*:", re.I), r"<keyword>\1:</keyword>"),
]

BR_RE = re.compile(r"<br\s*/?>", re.I)
# <keyword>Phase…</keyword> déjà présent — ne pas re-matcher à l’intérieur
INSIDE_KW = re.compile(r"<keyword>[^<]*</keyword>", re.I)

PHASE_KW_START = re.compile(
    r"(\s*)(<keyword>\s*(?:"
    r"Ombre|Réponse|Reponse|Compagnie|Manœuvre|Manoeuvre|Archerie|Affectation|Combat|Ralliement|"
    r"Schatten|Reaktion|Gemeinschaft|Manöver|Manoever|Fernkampf|Zuweisung|Kampf|Sammeln|"
    r"Ombra|Risposta|Compagnia|Manovra|Tiro|Assegnazione|Schermaglia|Raduno|"
    r"Sombra|Respuesta|Comunidad|Maniobra|Arquería|Arqueria|Asignación|Asignacion|Escaramuza|Reagrupamiento|"
    r"Shadow|Response|Fellowship|Maneuver|Archery|Assignment|Skirmish|Regroup"
    r")\s*:?\s*</keyword>)",
    re.I,
)


def wrap_plain_phases(text: str) -> str:
    """Enveloppe les phases nues, en ignorant le contenu déjà dans <keyword>."""
    parts: list[str] = []
    last = 0
    for m in INSIDE_KW.finditer(text):
        chunk = text[last : m.start()]
        for pat, repl in PHASE_PATTERNS:
            chunk = pat.sub(repl, chunk)
        parts.append(chunk)
        parts.append(m.group(0))
        last = m.end()
    chunk = text[last:]
    for pat, repl in PHASE_PATTERNS:
        chunk = pat.sub(repl, chunk)
    parts.append(chunk)
    return "".join(parts)


def insert_phase_breaks(text: str, en_br_count: int) -> str:
    """Ajoute <br> avant les keyword de phase si l’EN en a davantage."""
    if en_br_count <= 0:
        return text
    if len(BR_RE.findall(text)) >= en_br_count:
        return text

    # Parcourt de droite à gauche pour ne pas décaler les index
    matches = list(PHASE_KW_START.finditer(text))
    inserts: list[int] = []
    for m in matches:
        prefix = text[: m.start()]
        if not prefix.strip():
            continue
        tail = prefix[-12:] if len(prefix) >= 12 else prefix
        if BR_RE.search(tail):
            continue
        inserts.append(m.start() + len(m.group(1)))  # juste avant <keyword>

    # N’insérer que le nombre manquant (les derniers keywords de phase d’abord)
    missing = en_br_count - len(BR_RE.findall(text))
    if missing <= 0 or not inserts:
        return text
    chosen = inserts[-missing:] if len(inserts) > missing else inserts
    out = text
    for pos in sorted(chosen, reverse=True):
        out = out[:pos] + "<br>" + out[pos:]
    return out


# Corrections ciblées (contenu manquant évident)
MANUAL_FIXES: dict[str, dict[str, str]] = {
    "1R183": {
        "French Text": (
            "Jouez cette carte dans votre aire de soutien.<br>"
            "<keyword>Réponse :</keyword> Si votre Orque <symbol>moria</symbol> remporte un combat, "
            "défaussez les cartes et les blessures sur cet Orque et empilez cet Orque sur cette situation.<br>"
            "<keyword>Ombre :</keyword> Jouez un Orque empilé ici comme s’il était joué de votre main."
        ),
    },
}


def main() -> None:
    # Même encodage que scripts/convert (windows-1252).
    encoding = "cp1252"
    with CSV_PATH.open(newline="", encoding=encoding) as f:
        reader = csv.DictReader(f)
        fieldnames = reader.fieldnames
        assert fieldnames
        rows = list(reader)

    changed_cells = 0
    changed_rows = 0
    for row in rows:
        coll = row.get("Collectors Info") or ""
        en = row.get("Text") or ""
        en_br = len(BR_RE.findall(en))
        row_changed = False

        manual = MANUAL_FIXES.get(coll)
        if manual:
            for col, value in manual.items():
                if row.get(col) != value:
                    row[col] = value
                    changed_cells += 1
                    row_changed = True

        for col in LANG_COLS:
            original = row.get(col) or ""
            if not original.strip():
                continue
            # Ne pas re-traiter une cellule déjà remplacée manuellement
            if manual and col in manual:
                continue
            fixed = wrap_plain_phases(original)
            fixed = insert_phase_breaks(fixed, en_br)
            if fixed != original:
                row[col] = fixed
                changed_cells += 1
                row_changed = True

        if row_changed:
            changed_rows += 1

    with CSV_PATH.open("w", newline="", encoding=encoding) as f:
        writer = csv.DictWriter(
            f,
            fieldnames=fieldnames,
            lineterminator="\n",
            quoting=csv.QUOTE_MINIMAL,
        )
        writer.writeheader()
        writer.writerows(rows)

    print(f"Updated {changed_cells} cells across {changed_rows} rows → {CSV_PATH}")


if __name__ == "__main__":
    main()
