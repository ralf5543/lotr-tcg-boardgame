/**
 * Audit « texte vs capacités » d’un deck JSON.
 *
 * Usage :
 *   npm run audit:deck -- deck-1793993637649
 *   npm run audit:deck -- src/game/decks/gondor-uruks.json
 *   npm run audit:deck -- --list
 *
 * Statuts :
 *   OK      — effets couverts (abilities / hors-abilities connus) ou pas d’effet à parser
 *   PARTIEL — au moins une ability, mais le texte a encore des clauses de phase non couvertes
 *   INERTE  — gametext d’effet sans ability (candidat playtest / fragment / exception)
 *   MANQUANT — id introuvable dans cards.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DECKS_DIR = path.join(ROOT, 'src/game/decks');
const CARDS_PATH = path.join(ROOT, 'src/data/cards.json');
const SITES_PATH = path.join(ROOT, 'src/data/sites.json');

type AuditStatus = 'OK' | 'PARTIEL' | 'INERTE' | 'MANQUANT';

interface DeckConfig {
    id: string;
    name: string;
    ringBearerId: string;
    oneRingId: string;
    startingCompanionIds: string[];
    freePeople: string[];
    shadow: string[];
    siteIds: string[];
}

interface CardLike {
    id: string;
    type?: string;
    title?: string;
    abilities?: { phases?: string[]; trigger?: { type?: string }; text?: string }[];
    actionPhases?: string[];
    keywords?: string[];
    grantsKeywords?: string[];
    toPlay?: unknown;
    playFromDiscard?: unknown;
    allowsExtraHandWeapon?: boolean;
    startingFellowshipTwilightReduce?: number;
    i18n?: { fr?: { title?: string; gameText?: string }; en?: { title?: string; gameText?: string } };
    gameText?: string;
}

/** Phase d’action uniquement (`Skirmish:`), pas le mot-clé `Fellowship.` imprimé. */
const PHASE_RE =
    /(?:\*\*|<(?:keyword)>)?(Fellowship|Shadow|Maneuver|Archery|Assignment|Skirmish|Regroup|Response):(?:\*\*|<\/(?:keyword)>)?/gi;

/** Phrases purement « setup » / mots-clés, sans capacité activable. */
const FLUFF_ONLY_RE =
    /^(?:\s*(?:\*\*|<(?:keyword)>)?(?:Ring-bound|Ring-bearer|Fierce|Tale|Stealth|Ranger|Knight|Archer|Damage\s*\+\s*\d+|Hunter\s*\d+|Enduring|Lurker|Ambush|Search|Spell|Pipeweed|Besieger|Easterling|Southron|Corsair|Tentacle|Machine|Engine|Toil\s*\d+)(?:\*\*|<\/(?:keyword)>)?(?:\s*\([^)]*\))?\.?\s*)+$/i;

function stripMarkup(text: string): string {
    return text
        .replace(/<br\s*\/?>/gi, ' ')
        .replace(/<\/?(?:keyword|symbol|b)[^>]*>/gi, ' ')
        .replace(/\*\*/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function englishText(card: CardLike): string {
    return (card.i18n?.en?.gameText || card.gameText || '').trim();
}

function displayTitle(card: CardLike): string {
    return (
        card.i18n?.fr?.title ||
        card.i18n?.en?.title ||
        card.title ||
        card.id
    );
}

function phaseMarkersInText(text: string): string[] {
    const found: string[] = [];
    const re = new RegExp(PHASE_RE.source, 'gi');
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
        found.push(match[1].toUpperCase());
    }
    return found;
}

function abilityPhases(card: CardLike): Set<string> {
    const set = new Set<string>();
    for (const p of card.actionPhases || []) {
        set.add(String(p).toUpperCase());
    }
    for (const ab of card.abilities || []) {
        for (const p of ab.phases || []) {
            set.add(String(p).toUpperCase());
        }
        if (ab.trigger?.type === 'WHILE') set.add('WHILE');
        if (ab.trigger?.type) set.add(String(ab.trigger.type).toUpperCase());
    }
    return set;
}

/** Hors abilities : champs convert déjà branchés. */
function hasNonAbilityCoverage(card: CardLike): boolean {
    if (card.grantsKeywords && card.grantsKeywords.length > 0) return true;
    if (card.toPlay) return true;
    if (card.playFromDiscard) return true;
    if (card.allowsExtraHandWeapon) return true;
    if (card.startingFellowshipTwilightReduce) return true;
    return false;
}

function effectishRemainder(text: string): string {
    let t = stripMarkup(text);
    // Bearer / plays on / Aid — setup, pas une ability de phase.
    t = t
        .replace(/^Bearer must be[^.]*\./gi, ' ')
        .replace(/^Plays? on[^.]*\./gi, ' ')
        .replace(/\bThis weapon may be borne in addition to[^.]*\./gi, ' ')
        .replace(/\bTo play,[^.]*\./gi, ' ')
        .replace(
            /(?:^|\.\s*)(?:Ring-bound|Ring-bearer|Fierce|Tale|Stealth|Ranger|Knight|Archer|Damage\s*\+\s*\d+|Hunter\s*\d+|Enduring|Lurker|Ambush|Search|Spell|Pipeweed)\b(?:\s*\([^)]*\))?\.?/gi,
            ' '
        )
        .replace(/\s+/g, ' ')
        .trim();
    return t;
}

function classify(card: CardLike | undefined, id: string): {
    status: AuditStatus;
    title: string;
    type: string;
    abilityCount: number;
    note: string;
    excerpt: string;
} {
    if (!card) {
        return {
            status: 'MANQUANT',
            title: id,
            type: '?',
            abilityCount: 0,
            note: 'Absent de cards.json / sites.json',
            excerpt: '',
        };
    }

    const text = englishText(card);
    const plain = stripMarkup(text);
    const abilities = card.abilities || [];
    const markers = phaseMarkersInText(text);
    const covered = abilityPhases(card);
    const remainder = effectishRemainder(text);
    const excerpt = remainder.slice(0, 110);

    if (!plain) {
        return {
            status: 'OK',
            title: displayTitle(card),
            type: card.type || '?',
            abilityCount: abilities.length,
            note: 'Pas de gametext',
            excerpt: '',
        };
    }

    if (FLUFF_ONLY_RE.test(plain) || remainder.length < 12) {
        return {
            status: 'OK',
            title: displayTitle(card),
            type: card.type || '?',
            abilityCount: abilities.length,
            note:
                abilities.length > 0
                    ? `${abilities.length} capacité(s)`
                    : 'Mots-clés / setup seulement',
            excerpt: '',
        };
    }

    if (abilities.length === 0) {
        // Frodon −1 coût : pas d’ability mais texte d’effet → INERTE (sauf hors-ability).
        if (hasNonAbilityCoverage(card) && markers.length === 0) {
            return {
                status: 'OK',
                title: displayTitle(card),
                type: card.type || '?',
                abilityCount: 0,
                note: 'Couvert hors abilities (toPlay / grants / …)',
                excerpt,
            };
        }
        return {
            status: 'INERTE',
            title: displayTitle(card),
            type: card.type || '?',
            abilityCount: 0,
            note:
                markers.length > 0
                    ? `Phases texte : ${[...new Set(markers)].join(', ')} — 0 ability`
                    : 'Effet texte sans ability',
            excerpt,
        };
    }

    // PARTIEL : marqueur de phase dans le texte sans phase / trigger correspondant.
    const uncovered = [...new Set(markers)].filter((phase) => {
        if (phase === 'RESPONSE') {
            return ![...covered].some(
                (c) => c === 'RESPONSE' || c.startsWith('ABOUT_') || c.includes('WINS') || c.includes('HEAL') || c.includes('WOUND') || c.includes('PLAY') || c.includes('DIES') || c.includes('BURDEN') || c.includes('RING')
            );
        }
        return !covered.has(phase);
    });

    if (uncovered.length > 0) {
        return {
            status: 'PARTIEL',
            title: displayTitle(card),
            type: card.type || '?',
            abilityCount: abilities.length,
            note: `${abilities.length} ability — phases texte non couvertes : ${uncovered.join(', ')}`,
            excerpt,
        };
    }

    return {
        status: 'OK',
        title: displayTitle(card),
        type: card.type || '?',
        abilityCount: abilities.length,
        note: `${abilities.length} capacité(s)`,
        excerpt: '',
    };
}

function collectDeckIds(deck: DeckConfig): { id: string; zone: string }[] {
    const rows: { id: string; zone: string }[] = [];
    const push = (id: string | undefined, zone: string) => {
        if (id) rows.push({ id, zone });
    };
    push(deck.ringBearerId, 'Porteur');
    push(deck.oneRingId, 'Anneau');
    for (const id of deck.startingCompanionIds || []) {
        push(id, 'Départ');
    }
    for (const id of deck.freePeople || []) push(id, 'FP');
    for (const id of deck.shadow || []) push(id, 'Ombre');
    for (const id of deck.siteIds || []) push(id, 'Site');
    return rows;
}

function resolveDeckPath(arg: string): string {
    if (arg.endsWith('.json') && fs.existsSync(path.resolve(ROOT, arg))) {
        return path.resolve(ROOT, arg);
    }
    if (arg.endsWith('.json') && fs.existsSync(arg)) {
        return path.resolve(arg);
    }
    const byId = path.join(DECKS_DIR, `${arg}.json`);
    if (fs.existsSync(byId)) return byId;
    const bare = path.join(DECKS_DIR, arg);
    if (fs.existsSync(bare)) return bare;
    throw new Error(
        `Deck introuvable : ${arg}\nEssaie : npm run audit:deck -- --list`
    );
}

function listDecks(): void {
    const files = fs
        .readdirSync(DECKS_DIR)
        .filter((f) => f.endsWith('.json'))
        .sort();
    console.log('Decks dans src/game/decks/ :\n');
    for (const file of files) {
        try {
            const deck = JSON.parse(
                fs.readFileSync(path.join(DECKS_DIR, file), 'utf8')
            ) as DeckConfig;
            console.log(`  ${deck.id || file}  —  ${deck.name || '?'}`);
        } catch {
            console.log(`  ${file}  —  (JSON illisible)`);
        }
    }
}

function main(): void {
    const args = process.argv.slice(2).filter((a) => a !== '--');
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`Usage :
  npm run audit:deck -- <deck-id|chemin.json>
  npm run audit:deck -- --list

Exemple :
  npm run audit:deck -- deck-1793993637649`);
        process.exit(args.includes('--help') || args.includes('-h') ? 0 : 1);
    }
    if (args.includes('--list')) {
        listDecks();
        return;
    }

    const deckPath = resolveDeckPath(args[0]!);
    const deck = JSON.parse(fs.readFileSync(deckPath, 'utf8')) as DeckConfig;
    const cards = JSON.parse(fs.readFileSync(CARDS_PATH, 'utf8')) as CardLike[];
    const sites = fs.existsSync(SITES_PATH)
        ? (JSON.parse(fs.readFileSync(SITES_PATH, 'utf8')) as CardLike[])
        : [];
    const byId = new Map<string, CardLike>();
    for (const c of [...cards, ...sites]) {
        if (c?.id) byId.set(c.id, c);
    }

    const entries = collectDeckIds(deck);
    const seen = new Map<
        string,
        {
            status: AuditStatus;
            title: string;
            type: string;
            abilityCount: number;
            note: string;
            excerpt: string;
            zones: Set<string>;
            copies: number;
        }
    >();

    for (const { id, zone } of entries) {
        const existing = seen.get(id);
        if (existing) {
            existing.copies += 1;
            existing.zones.add(zone);
            continue;
        }
        const result = classify(byId.get(id), id);
        seen.set(id, {
            ...result,
            zones: new Set([zone]),
            copies: 1,
        });
    }

    const rows = [...seen.entries()].map(([id, row]) => ({ id, ...row }));
    const order: AuditStatus[] = ['MANQUANT', 'INERTE', 'PARTIEL', 'OK'];
    rows.sort((a, b) => {
        const d = order.indexOf(a.status) - order.indexOf(b.status);
        if (d !== 0) return d;
        return a.id.localeCompare(b.id);
    });

    const counts = { MANQUANT: 0, INERTE: 0, PARTIEL: 0, OK: 0 };
    for (const r of rows) counts[r.status] += 1;

    console.log(
        `\nAudit deck — ${deck.name || deck.id} (${path.relative(ROOT, deckPath)})`
    );
    console.log(
        `Uniques : ${rows.length}  |  OK ${counts.OK}  ·  PARTIEL ${counts.PARTIEL}  ·  INERTE ${counts.INERTE}  ·  MANQUANT ${counts.MANQUANT}\n`
    );

    const printGroup = (status: AuditStatus, label: string) => {
        const group = rows.filter((r) => r.status === status);
        if (group.length === 0) return;
        console.log(`── ${label} (${group.length}) ──`);
        for (const r of group) {
            const zones = [...r.zones].join('+');
            const copies = r.copies > 1 ? ` ×${r.copies}` : '';
            console.log(
                `  ${r.id.padEnd(8)} ${r.type.padEnd(10)} ${r.title}${copies}`
            );
            console.log(`           ${r.note}  [${zones}]`);
            if (r.excerpt) {
                console.log(`           « ${r.excerpt}${r.excerpt.length >= 110 ? '…' : ''} »`);
            }
        }
        console.log('');
    };

    printGroup('MANQUANT', 'MANQUANT');
    printGroup('INERTE', 'INERTE — à playtester / fragment / exception');
    printGroup('PARTIEL', 'PARTIEL — ability présente, clause texte non couverte');
    if (args.includes('--verbose') || args.includes('-v')) {
        printGroup('OK', 'OK');
    } else {
        console.log(
            `(OK : ${counts.OK} — passe --verbose pour la liste complète)\n`
        );
    }

    if (counts.INERTE + counts.PARTIEL + counts.MANQUANT > 0) {
        process.exitCode = 1;
    }
}

main();
