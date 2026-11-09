import {
    catalogCardId,
    displayFullName,
    displayTitle,
    isSiteCard,
} from '../../decks/cardMeta';
import type {
    Ability,
    CardState,
    GameState,
    JournalEntry,
    SiteCardState,
} from '../types';
import { findTargetCard } from '../../utils/cardUtils';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import { TRANSLATIONS } from '../translations';
import { otherPlayerId, playerDisplayName } from './playerName';

const JOURNAL_CAP = 200;

function pushEntry(G: GameState, entry: JournalEntry): void {
    if (!G.journalLog) G.journalLog = [];
    G.journalLog.push(entry);
    if (G.journalLog.length > JOURNAL_CAP) {
        G.journalLog = G.journalLog.slice(-JOURNAL_CAP);
    }
}

function actorAvatarUrl(
    G: GameState,
    actorId: string | null | undefined
): string | undefined {
    if (actorId == null || actorId === '') return undefined;
    const url = G.players[String(actorId)]?.profile?.avatar?.trim();
    return url || undefined;
}

/** Ligne neutre (pas de « Vous »). */
export function appendJournal(G: GameState, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    pushEntry(G, { named: trimmed });
}

/**
 * Fait attribué à un joueur : le spectateur local voit `vous`,
 * les autres voient `named` (avec le vrai nom).
 */
export function appendActorJournal(
    G: GameState,
    actorId: string | null | undefined,
    forms: { vous: string; named: string },
    extras?: Pick<JournalEntry, 'playedCard' | 'actorAvatar'>
): void {
    const vous = forms.vous.trim();
    const named = forms.named.trim();
    if (!named) return;
    const id = actorId != null ? String(actorId) : '';
    if (!id) {
        pushEntry(G, { named, ...extras });
        return;
    }
    pushEntry(G, {
        actorId: id,
        vous: vous || named,
        named,
        actorAvatar: extras?.actorAvatar ?? actorAvatarUrl(G, id),
        playedCard: extras?.playedCard,
    });
}

/**
 * « {nom} a joué {carte} » — entrée riche (avatar + lien + vignette côté UI).
 */
export function appendCardPlayedJournal(
    G: GameState,
    actorId: string | null | undefined,
    card: CardState | SiteCardState | null | undefined
): void {
    if (!card) return;
    const asCard = card as CardState;
    const label = displayFullName(asCard, catalogCardId(asCard));
    if (!label) return;
    const name = playerDisplayName(G, actorId);
    const raw = card as CardState & SiteCardState & { type?: string; kind?: string };
    const site =
        isSiteCard(asCard) ||
        raw.type === 'SITE' ||
        raw.kind === 'SITE' ||
        Boolean(raw.siteNumber != null && !raw.culture);
    appendActorJournal(
        G,
        actorId,
        {
            vous: `Vous avez joué ${label}.`,
            named: `${name} a joué ${label}.`,
        },
        {
            playedCard: {
                catalogId: catalogCardId(asCard),
                label,
                imageUrl: asCard.imageUrl || raw.imageUrl,
                orientation: site ? 'landscape' : 'portrait',
            },
        }
    );
}

/** Texte à afficher pour le joueur local. */
export function formatJournalEntry(
    entry: JournalEntry | string,
    myPlayerId: string | null | undefined
): string {
    if (typeof entry === 'string') return entry;
    const mine =
        entry.actorId != null &&
        myPlayerId != null &&
        String(entry.actorId) === String(myPlayerId);
    if (mine && entry.vous) return entry.vous;
    return entry.named;
}

/** Raccourci : ligne d’acteur avec le nom profil courant. */
export function appendNamedActorJournal(
    G: GameState,
    actorId: string | null | undefined,
    build: (name: string) => { vous: string; named: string }
): void {
    const name = playerDisplayName(G, actorId);
    appendActorJournal(G, actorId, build(name));
}

/** Terminologie : 0/1 → point-fardeau ; 2+ → points-fardeau. */
export function formatPointsFardeau(count: number): string {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    return n <= 1 ? `${n} point-fardeau` : `${n} points-fardeau`;
}

/**
 * Annonce les rôles FP / Ombre (deux lignes, chacune personnalisable « Vous »).
 * `prefix` : ex. « Nouveau tour ! » (ajouté uniquement sur la 1ʳᵉ ligne).
 */
export function appendSideRolesJournal(
    G: GameState,
    fpPlayerId: string,
    options?: { prefix?: string }
): void {
    const fpId = String(fpPlayerId);
    const shadowId = otherPlayerId(fpId);
    const fpName = playerDisplayName(G, fpId);
    const shadowName = playerDisplayName(G, shadowId);
    const prefix = options?.prefix?.trim()
        ? `${options.prefix.trim()} `
        : '';

    appendActorJournal(G, fpId, {
        vous: `${prefix}Vous jouez les Peuples Libres.`,
        named: `${prefix}${fpName} joue les Peuples Libres.`,
    });
    appendActorJournal(G, shadowId, {
        vous: 'Vous jouez l’Ombre.',
        named: `${shadowName} joue l’Ombre.`,
    });
}

/** Texte live neutre (bandeau) pour les rôles. */
export function formatSideRolesStatus(
    G: GameState,
    fpPlayerId: string,
    options?: { prefix?: string; suffix?: string }
): string {
    const fpId = String(fpPlayerId);
    const shadowId = otherPlayerId(fpId);
    const prefix = options?.prefix?.trim()
        ? `${options.prefix.trim()} `
        : '';
    const suffix = options?.suffix?.trim()
        ? ` ${options.suffix.trim()}`
        : '';
    return `${prefix}${playerDisplayName(G, fpId)} joue les Peuples Libres. ${playerDisplayName(G, shadowId)} joue l’Ombre.${suffix}`;
}

/** `startOfFellowship` / `fellowship` → clé FELLOWSHIP + libellé FR. */
export function resolvePhaseJournalMeta(phase?: string | null): {
    phaseKey: string;
    label: string;
} | null {
    if (!phase) return null;
    const canonical = phase.replace(/^startOf/i, '').toLowerCase();
    const phaseKey = canonical.toUpperCase();
    const label =
        TRANSLATIONS.phase[phaseKey as keyof typeof TRANSLATIONS.phase] ||
        phaseKey;
    if (!label) return null;
    return { phaseKey, label };
}

/** Marqueur de phase dans le fil (une ligne, style dédié côté UI). */
export function appendPhaseJournal(
    G: GameState,
    phase?: string | null
): void {
    const meta = resolvePhaseJournalMeta(phase);
    if (!meta) return;
    pushEntry(G, {
        kind: 'phase',
        phaseKey: meta.phaseKey,
        named: `Phase ${meta.label}`,
    });
}

const STAT_FR: Record<string, string> = {
    STRENGTH: 'force',
    VITALITY: 'vitalité',
    RESISTANCE: 'résistance',
    TWILIGHT_COST: 'crépuscule',
};

const PHASE_ABILITY_FR: Record<string, string> = {
    FELLOWSHIP: 'compagnie',
    SHADOW: 'ombre',
    MANEUVER: 'manœuvre',
    ARCHERY: 'archerie',
    ASSIGNMENT: 'affectation',
    SKIRMISH: 'combat',
    REGROUP: 'ralliement',
    RESPONSE: 'réponse',
};

function firstChosenId(
    chosen?: string | string[] | null
): string | undefined {
    if (!chosen) return undefined;
    if (Array.isArray(chosen)) return chosen.find(Boolean);
    return chosen || undefined;
}

/**
 * Journal d’une capacité en jeu — phrase riche si le modèle est simple
 * (affaiblir → bonus de force), sinon repli générique.
 */
export function appendAbilityUsedJournal(
    G: GameState,
    source: CardState,
    ability: Ability,
    effectTargetId?: string | string[] | null
): void {
    const sourceName = displayTitle(source);
    if (!sourceName) return;

    const exert = ability.cost?.[0]?.exert?.[0];
    const tempStat = (ability.effects || []).find(
        (effect) => effect.type === 'ADD_TEMP_STAT'
    );
    const chosenId = firstChosenId(effectTargetId);
    const effectTarget = chosenId
        ? (findTargetCard(G, chosenId) as CardState | null)
        : null;

    if (exert && tempStat && tempStat.type === 'ADD_TEMP_STAT') {
        const stat = STAT_FR[tempStat.stat] || tempStat.stat.toLowerCase();
        const sign = tempStat.value > 0 ? '+' : '';
        const bonus = `${sign}${tempStat.value} en ${stat}`;
        const targetLabel = effectTarget
            ? displayTitle(effectTarget)
            : null;
        if (targetLabel) {
            appendJournal(
                G,
                `${sourceName} s’est affaibli pour donner ${bonus} à ${targetLabel}.`
            );
            return;
        }
        const parts = formatAbilityLabelParts(ability, source);
        if (parts.effect) {
            appendJournal(
                G,
                `${sourceName} s’est affaibli pour ${parts.effect}.`
            );
            return;
        }
    }

    const phaseKey = (ability.phases?.[0] || '').toUpperCase();
    const phaseBit = PHASE_ABILITY_FR[phaseKey]
        ? ` de ${PHASE_ABILITY_FR[phaseKey]}`
        : '';
    appendJournal(G, `${sourceName} a utilisé une compétence${phaseBit}.`);
}

/** « une / deux / N blessure(s) ». */
export function formatBlessuresCount(count: number): string {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (n === 1) return 'une blessure';
    if (n === 2) return 'deux blessures';
    return `${n} blessure${n > 1 ? 's' : ''}`;
}
