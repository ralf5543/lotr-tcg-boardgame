import { getCardById } from '../game/cardsData';
import type { CardState } from '../game/types';
import type { DeckWhereKey } from '../i18n/ui/deckValidation';
import {
    isOnXList,
    isStandardSiteSet,
    MAX_COPIES_PER_TITLE,
    MAX_RING_BEARER_COPIES_IN_DECK,
    MAX_SITES_SAME_TWILIGHT,
    MIN_DRAW_DECK_SIZE,
    STARTING_FELLOWSHIP_TWILIGHT_CAP,
} from './formatRules';
import type { DeckConfig, DeckIssue, DeckValidationResult } from './types';

function isSiteCard(card: CardState): boolean {
    const raw = card as CardState & { type?: string; kind?: string };
    return raw.type === 'SITE' || raw.kind === 'SITE';
}

function issue(
    code: string,
    message: string,
    severity: DeckIssue['severity'] = 'error',
    params?: DeckIssue['params']
): DeckIssue {
    return { code, severity, message, params };
}

function cardTitle(card: CardState): string {
    return (
        card.i18n?.en?.title ||
        card.i18n?.fr?.title ||
        card.title ||
        card.id
    ).trim();
}

function resolveCard(id: string): CardState | undefined {
    return getCardById(id);
}

export function isLegalRingBearer(card: CardState | undefined): boolean {
    if (!card || card.type !== 'COMPANION') return false;
    if (card.canBeRingbearer) return true;
    const title = cardTitle(card).toLowerCase();
    return title === 'frodo' || title === 'frodon';
}

export function isOneRing(card: CardState | undefined): boolean {
    return Boolean(card && card.type === 'RING');
}

/**
 * Réductions WHILE évaluables hors plateau (Halbarad : Porteur résist. ≥ N).
 * Les passifs « spot » en jeu ne s’appliquent pas à la construction.
 */
/** Résistance imprimée du Porteur (défaut 6, comme en jeu). */
function ringBearerPrintedResistance(
    ringBearer?: CardState | null
): number {
    if (!ringBearer) return 0;
    const raw = Number(ringBearer.resistance);
    return Number.isFinite(raw) && raw > 0 ? raw : 6;
}

function deckBuildTwilightCostModifier(
    card: CardState,
    ringBearer?: CardState | null
): number {
    let mod = 0;
    const rbRes = ringBearerPrintedResistance(ringBearer);
    for (const ability of card.abilities || []) {
        if (ability.trigger?.type !== 'WHILE') continue;
        const minRes = ability.trigger.ringBearerMinResistance;
        if (typeof minRes !== 'number' || minRes <= 0) continue;
        if (rbRes < minRes) continue;
        for (const effect of ability.effects || []) {
            if (effect.type !== 'MODIFY_STAT') continue;
            if (effect.stat !== 'TWILIGHT_COST') continue;
            if (effect.target !== 'SELF') continue;
            mod += Number(effect.value) || 0;
        }
    }
    return mod;
}

/**
 * Coût crépuscule pour le plafond de compagnie de départ (max 4).
 * `ringBearer` : pour les réductions liées à sa résistance (Halbarad…).
 */
export function startingCompanionTwilightCost(
    card: CardState,
    ringBearer?: CardState | null
): number {
    const printed = Number(card.twilightCost) || 0;
    const reduce = Number(card.startingFellowshipTwilightReduce) || 0;
    const whileMod = deckBuildTwilightCostModifier(card, ringBearer);
    return Math.max(0, printed - reduce + whileMod);
}

function pushForbiddenCard(
    errors: DeckIssue[],
    id: string,
    card: CardState | undefined,
    where: DeckWhereKey
): void {
    if (!card) {
        errors.push(
            issue(
                'UNKNOWN_CARD',
                `Carte introuvable : ${id} (${where}).`,
                'error',
                { id, where }
            )
        );
        return;
    }
    if (isOnXList(id)) {
        errors.push(
            issue(
                'X_LIST',
                `${cardTitle(card)} (${id}) est sur la liste X (${where}).`,
                'error',
                { title: cardTitle(card), id, where }
            )
        );
    }
}

/**
 * Valide un deck pour le format Standard du projet.
 * `ok` = aucune erreur (les avertissements n’empêchent pas « Jouable »).
 */
export function validateDeck(config: DeckConfig): DeckValidationResult {
    const errors: DeckIssue[] = [];
    const warnings: DeckIssue[] = [];

    if (!config.name?.trim()) {
        errors.push(issue('NAME', 'Le deck doit avoir un nom.'));
    }

    const rb = resolveCard(config.ringBearerId);
    pushForbiddenCard(errors, config.ringBearerId, rb, 'ringBearer');
    if (!isLegalRingBearer(rb)) {
        errors.push(
            issue(
                'RING_BEARER',
                'Porteur invalide : choisissez Frodon ou un personnage pouvant porter l’Anneau.'
            )
        );
    }

    const ring = resolveCard(config.oneRingId);
    pushForbiddenCard(errors, config.oneRingId, ring, 'oneRing');
    if (!isOneRing(ring)) {
        errors.push(
            issue(
                'ONE_RING',
                'L’Anneau Unique doit être une carte de type Anneau.'
            )
        );
    }

    // Compagnons de départ
    let startingCost = 0;
    const startingIds = config.startingCompanionIds || [];
    for (const id of startingIds) {
        const card = resolveCard(id);
        pushForbiddenCard(errors, id, card, 'starting');
        if (!card) continue;
        if (card.type !== 'COMPANION') {
            errors.push(
                issue(
                    'STARTING_TYPE',
                    `${cardTitle(card)} n’est pas un compagnon (compagnie de départ).`,
                    'error',
                    { title: cardTitle(card) }
                )
            );
            continue;
        }
        if (rb && cardTitle(card).toLowerCase() === cardTitle(rb).toLowerCase()) {
            // Même titre que le Porteur en départ : inhabituel mais possible (autre version).
        }
        startingCost += startingCompanionTwilightCost(card, rb);
    }
    if (startingCost > STARTING_FELLOWSHIP_TWILIGHT_CAP) {
        errors.push(
            issue(
                'STARTING_COST',
                `Coût de la compagnie de départ : ${startingCost} (max ${STARTING_FELLOWSHIP_TWILIGHT_CAP}).`,
                'error',
                {
                    cost: startingCost,
                    max: STARTING_FELLOWSHIP_TWILIGHT_CAP,
                }
            )
        );
    }

    const freePeople = config.freePeople || [];
    const shadow = config.shadow || [];

    for (const id of freePeople) {
        const card = resolveCard(id);
        pushForbiddenCard(errors, id, card, 'fpDraw');
        if (!card) continue;
        if (isSiteCard(card)) {
            errors.push(
                issue(
                    'FP_SITE',
                    `Site interdit dans la pioche : ${id}.`,
                    'error',
                    { id }
                )
            );
        }
        if (card.type === 'RING') {
            errors.push(
                issue(
                    'FP_RING',
                    `Anneau interdit dans la pioche : ${id}.`,
                    'error',
                    { id }
                )
            );
        }
        if (card.kind === 'SHADOW') {
            // Avertissement : données / Gollum parfois ambigus ; ne bloque pas « Jouable ».
            warnings.push(
                issue(
                    'FP_KIND',
                    `${cardTitle(card)} est marquée Ombre (pioche Peuples Libres).`,
                    'warning',
                    { title: cardTitle(card) }
                )
            );
        }
    }

    for (const id of shadow) {
        const card = resolveCard(id);
        pushForbiddenCard(errors, id, card, 'shadowDraw');
        if (!card) continue;
        if (isSiteCard(card)) {
            errors.push(
                issue(
                    'SHADOW_SITE',
                    `Site interdit dans la pioche : ${id}.`,
                    'error',
                    { id }
                )
            );
        }
        if (card.type === 'RING') {
            errors.push(
                issue(
                    'SHADOW_RING',
                    `Anneau interdit dans la pioche : ${id}.`,
                    'error',
                    { id }
                )
            );
        }
        if (card.kind === 'FREE_PEOPLE') {
            warnings.push(
                issue(
                    'SHADOW_KIND',
                    `${cardTitle(card)} est marquée Peuples Libres (pioche Ombre).`,
                    'warning',
                    { title: cardTitle(card) }
                )
            );
        }
    }

    const fpCount = freePeople.length + startingIds.length;
    const shadowCount = shadow.length;
    if (fpCount !== shadowCount) {
        errors.push(
            issue(
                'BALANCE',
                `Peuples Libres (${fpCount} = pioche ${freePeople.length} + départ ${startingIds.length}) ≠ Ombre (${shadowCount}).`,
                'error',
                {
                    fp: fpCount,
                    fpDraw: freePeople.length,
                    starting: startingIds.length,
                    shadow: shadowCount,
                }
            )
        );
    }
    const drawSize = freePeople.length + shadow.length + startingIds.length;
    if (drawSize < MIN_DRAW_DECK_SIZE) {
        errors.push(
            issue(
                'SIZE',
                `Pioche trop petite : ${drawSize} cartes (min ${MIN_DRAW_DECK_SIZE}, départ inclus).`,
                'error',
                { n: drawSize, min: MIN_DRAW_DECK_SIZE }
            )
        );
    }

    // Copies par titre (pioche + départ)
    const titleCounts = new Map<string, number>();
    for (const id of [...freePeople, ...shadow, ...startingIds]) {
        const card = resolveCard(id);
        if (!card) continue;
        const title = cardTitle(card).toLowerCase();
        titleCounts.set(title, (titleCounts.get(title) || 0) + 1);
    }
    const rbTitle = rb ? cardTitle(rb).toLowerCase() : '';
    for (const [title, count] of titleCounts) {
        const max =
            rbTitle && title === rbTitle
                ? MAX_RING_BEARER_COPIES_IN_DECK
                : MAX_COPIES_PER_TITLE;
        if (count > max) {
            errors.push(
                issue(
                    'COPIES',
                    `Trop de copies de « ${title} » : ${count} (max ${max}).`,
                    'error',
                    { title, count, max }
                )
            );
        }
    }

    // Sites
    const siteIds = config.siteIds || [];
    if (siteIds.length !== 9) {
        errors.push(
            issue(
                'SITE_COUNT',
                `Le paquet d’aventure doit avoir 9 sites (actuellement ${siteIds.length}).`,
                'error',
                { n: siteIds.length }
            )
        );
    }
    const seenSites = new Set<string>();
    const twilightCounts = new Map<number, number>();
    for (const id of siteIds) {
        if (seenSites.has(id.toLowerCase())) {
            errors.push(
                issue('SITE_DUP', `Site en double : ${id}.`, 'error', {
                    id,
                })
            );
        }
        seenSites.add(id.toLowerCase());
        const card = resolveCard(id);
        pushForbiddenCard(errors, id, card, 'adventure');
        if (!card) continue;
        if (!isSiteCard(card)) {
            errors.push(
                issue('SITE_TYPE', `${id} n’est pas un site.`, 'error', {
                    id,
                })
            );
            continue;
        }
        if (!isStandardSiteSet(Number(card.set) || 0)) {
            errors.push(
                issue(
                    'SITE_SET',
                    `${cardTitle(card)} (${id}) : sites sets 11–18 uniquement.`,
                    'error',
                    { title: cardTitle(card), id }
                )
            );
        }
        const tw = Number(card.twilightCost) || 0;
        twilightCounts.set(tw, (twilightCounts.get(tw) || 0) + 1);
    }
    for (const [tw, count] of twilightCounts) {
        if (count > MAX_SITES_SAME_TWILIGHT) {
            errors.push(
                issue(
                    'SITE_TWILIGHT',
                    `${count} sites à crépuscule ${tw} (max ${MAX_SITES_SAME_TWILIGHT}).`,
                    'error',
                    {
                        count,
                        tw,
                        max: MAX_SITES_SAME_TWILIGHT,
                    }
                )
            );
        }
    }

    return {
        ok: errors.length === 0,
        errors,
        warnings,
    };
}
