import {
    catalogCardId,
    displayFullName,
    displayTitle,
    isSiteCard,
} from '../../decks/cardMeta';
import type { SupportedLanguage } from '../../i18n/languages';
import {
    formatJournalNotice,
    type JournalKey,
    type JournalParams,
} from '../../i18n/journal';
import { localizeGameTerms } from '../../i18n/terms';
import type {
    Ability,
    CardState,
    GameState,
    JournalCardRef,
    JournalEntry,
    SiteCardState,
} from '../types';
import { findTargetCard } from '../../utils/cardUtils';
import { formatAbilityLabelParts } from '../engine/abilities/collectAbilities';
import { findBearer } from '../engine/abilities/resolveCostTarget';
import { TRANSLATIONS } from '../translations';
import { clearAbilityPhaseUses } from './abilityPhaseUses';
import { clearStaleInteractionOnPhaseEntry } from './interactionCleanup';
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

/** Ligne neutre (pas de « Vous ») — FR brut (repli). */
export function appendJournal(G: GameState, text: string): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    pushEntry(G, { named: trimmed });
}

/** Ligne neutre structurée (clé + params). */
export function appendJournalNotice(
    G: GameState,
    key: JournalKey,
    params: JournalParams = {},
    extras?: Pick<JournalEntry, 'playedCard' | 'kind' | 'phaseKey'>
): void {
    const forms = formatJournalNotice('fr', key, params);
    const named = forms.named.trim();
    if (!named) return;
    pushEntry(G, {
        named,
        notice: { key, params },
        ...extras,
    });
}

/**
 * Fait attribué à un joueur : le spectateur local voit `vous`,
 * les autres voient `named` (avec le vrai nom).
 */
export function appendActorJournal(
    G: GameState,
    actorId: string | null | undefined,
    forms: { vous: string; named: string },
    extras?: Pick<JournalEntry, 'playedCard' | 'actorAvatar' | 'notice'>
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
        notice: extras?.notice,
    });
}

/** Fait acteur structuré (clé + params). */
export function appendActorJournalNotice(
    G: GameState,
    actorId: string | null | undefined,
    key: JournalKey,
    params: JournalParams = {},
    extras?: Pick<JournalEntry, 'playedCard' | 'actorAvatar'>
): void {
    const forms = formatJournalNotice('fr', key, params);
    appendActorJournal(
        G,
        actorId,
        {
            vous: forms.vous || forms.named,
            named: forms.named,
        },
        { ...extras, notice: { key, params } }
    );
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
    const params = { player: name, card: label };
    appendActorJournalNotice(G, actorId, 'PLAYED_CARD', params, {
        playedCard: {
            catalogId: catalogCardId(asCard),
            label,
            imageUrl: asCard.imageUrl || raw.imageUrl,
            orientation: site ? 'landscape' : 'portrait',
            showThumb: true,
        },
    });
}

/** Réf. journal pour une carte mentionnée (lien ; vignette optionnelle). */
function journalCardRef(
    card: CardState,
    options?: { showThumb?: boolean }
): JournalCardRef {
    return {
        catalogId: catalogCardId(card),
        label: displayFullName(card, catalogCardId(card)) || displayTitle(card),
        imageUrl: card.imageUrl,
        orientation: 'portrait',
        showThumb: options?.showThumb !== false,
    };
}

/** Texte à afficher pour le joueur local (langue UI). */
export function formatJournalEntry(
    entry: JournalEntry | string,
    myPlayerId: string | null | undefined,
    lang: SupportedLanguage = 'fr'
): string {
    if (typeof entry === 'string') {
        return localizeGameTerms(entry, lang);
    }
    const mine =
        entry.actorId != null &&
        myPlayerId != null &&
        String(entry.actorId) === String(myPlayerId);

    if (entry.notice?.key) {
        const forms = formatJournalNotice(
            lang,
            entry.notice.key,
            entry.notice.params || {}
        );
        if (mine && forms.vous) return forms.vous;
        return forms.named;
    }

    const raw = mine && entry.vous ? entry.vous : entry.named;
    return localizeGameTerms(raw, lang);
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

    appendActorJournalNotice(G, fpId, 'SIDE_FREE_PEOPLES', {
        player: fpName,
        prefix,
    });
    appendActorJournalNotice(G, shadowId, 'SIDE_SHADOW', {
        player: shadowName,
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
    // Limites « (limit N) » : compteur remis à chaque nouvelle phase jouable.
    clearAbilityPhaseUses(G);
    // Coupe AW / toasters orphelins de la phase précédente.
    clearStaleInteractionOnPhaseEntry(G);
    appendJournalNotice(
        G,
        'PHASE',
        { phaseKey: meta.phaseKey },
        { kind: 'phase', phaseKey: meta.phaseKey }
    );
}

const STAT_FR: Record<string, string> = {
    STRENGTH: 'force',
    VITALITY: 'vitalité',
    RESISTANCE: 'résistance',
    TWILIGHT_COST: 'crépuscule',
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

    // Possession / situation / artefact attaché → « Merry a utilisé Salt… »
    // Lien carte, sans vignette (compétence ≠ carte jouée).
    const bearer = findBearer(G, source);
    const isAttachedSupport =
        Boolean(bearer) &&
        (ability.source === 'ATTACHMENT' ||
            source.type === 'POSSESSION' ||
            source.type === 'CONDITION' ||
            source.type === 'ARTIFACT' ||
            source.type === 'THE_ONE_RING');
    if (isAttachedSupport && bearer) {
        const bearerName = displayTitle(bearer);
        if (bearerName) {
            const card = journalCardRef(source, { showThumb: false });
            appendJournalNotice(
                G,
                'ABILITY_USED_ATTACHED',
                { bearer: bearerName, card: card.label },
                { playedCard: card }
            );
            return;
        }
    }

    const isCharacter = ['COMPANION', 'ALLY', 'MINION'].includes(
        source.type || ''
    );
    appendJournalNotice(
        G,
        isCharacter ? 'ABILITY_USED_CHARACTER' : 'ABILITY_USED_SUPPORT',
        { card: sourceName }
    );
}

/** « une / deux / N blessure(s) ». */
export function formatBlessuresCount(count: number): string {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (n === 1) return 'une blessure';
    if (n === 2) return 'deux blessures';
    return `${n} blessure${n > 1 ? 's' : ''}`;
}

export type WoundJournalSource = 'archery' | 'threat' | 'site';

/**
 * Fait : une carte a pris des blessures (hors escarmouche déjà journalisée).
 * À appeler seulement si la blessure est réellement appliquée (pas en attente
 * de réponse « Empêcher »).
 */
export function appendWoundTakenJournal(
    G: GameState,
    card: CardState,
    options?: { source?: WoundJournalSource; count?: number }
): void {
    const name = displayTitle(card);
    if (!name) return;
    const params = {
        card: name,
        count: options?.count ?? 1,
        source: options?.source,
    };
    appendJournalNotice(
        G,
        card.isDead ? 'WOUND_TAKEN_DIED' : 'WOUND_TAKEN',
        params
    );
}

/** Fait : une carte a été soignée. */
export function appendHealedJournal(
    G: GameState,
    card: CardState,
    amount = 1
): void {
    const name = displayTitle(card);
    if (!name) return;
    const n = Math.max(1, Math.floor(Number(amount) || 1));
    appendJournalNotice(G, 'HEALED', { card: name, count: n });
}

/** Fait : la compagnie arrive sur un site déjà posé. */
export function appendMovedToSiteJournal(
    G: GameState,
    siteName: string,
    siteNumber: number
): void {
    const name = String(siteName || '').trim() || 'site inconnu';
    appendJournalNotice(G, 'MOVED_TO_SITE', {
        siteName: name,
        siteNumber,
    });
}
