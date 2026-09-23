import type {
    CardCulture,
    CardState,
    CultureTokenSpec,
    GameState,
} from '../types';

/** Cultures Peuples Libres (reinforce « Free Peoples token »). */
export const FREE_PEOPLES_CULTURES: ReadonlySet<CardCulture> = new Set([
    'DWARVEN',
    'ELVEN',
    'GANDALF',
    'GOLLUM',
    'GONDOR',
    'ROHAN',
    'SHIRE',
]);

const matchCard = (card: CardState | undefined | null, targetId: string) =>
    Boolean(card && (card.instanceId === targetId || card.id === targetId));

function shadowPlayerId(G: GameState): string {
    const fpId = G.fpPlayerId || '0';
    return fpId === '0' ? '1' : '0';
}

function visitInPlayCards(
    G: GameState,
    visit: (card: CardState) => void
): void {
    const visitList = (list?: CardState[]) => {
        if (!list) return;
        for (const card of list) {
            if (!card) continue;
            visit(card);
            card.attachments?.forEach((att) => {
                if (att) visit(att);
            });
        }
    };

    const fpId = G.fpPlayerId || '0';
    visitList(G.players?.[fpId]?.fellowshipArea);
    Object.values(G.players || {}).forEach((player) => {
        visitList(player.supportArea);
    });
    visitList(G.battlefield);
}

export function tokenCountOnCard(
    card: CardState,
    culture?: CultureTokenSpec
): number {
    const tokens = card.cultureTokens;
    if (!tokens) return 0;
    if (!culture || culture === 'ANY') {
        return Object.values(tokens).reduce((sum, n) => sum + (n || 0), 0);
    }
    if (culture === 'FREE_PEOPLES') {
        let sum = 0;
        for (const [key, n] of Object.entries(tokens)) {
            if (FREE_PEOPLES_CULTURES.has(key as CardCulture)) {
                sum += n || 0;
            }
        }
        return sum;
    }
    return tokens[culture] || 0;
}

/** Culture concrète à placer lors d’un reinforce sur cette carte. */
export function resolveReinforceCulture(
    card: CardState,
    spec: CultureTokenSpec
): CardCulture | null {
    const tokens = card.cultureTokens;
    if (!tokens) return null;

    if (spec !== 'FREE_PEOPLES' && spec !== 'ANY') {
        return (tokens[spec] || 0) > 0 ? spec : null;
    }

    if (spec === 'FREE_PEOPLES') {
        for (const culture of FREE_PEOPLES_CULTURES) {
            if ((tokens[culture] || 0) > 0) return culture;
        }
        return null;
    }

    // ANY : première culture présente
    for (const [key, n] of Object.entries(tokens)) {
        if ((n || 0) > 0) return key as CardCulture;
    }
    return null;
}

export function placeCultureTokens(
    card: CardState,
    culture: CardCulture,
    count: number
): number {
    if (count <= 0) return 0;
    if (!card.cultureTokens) card.cultureTokens = {};
    const current = card.cultureTokens[culture] || 0;
    card.cultureTokens[culture] = current + count;
    return count;
}

export function removeCultureTokensFromCard(
    card: CardState,
    culture: CultureTokenSpec,
    count: number
): number {
    if (count <= 0 || !card.cultureTokens) return 0;

    if (culture !== 'FREE_PEOPLES' && culture !== 'ANY') {
        const current = card.cultureTokens[culture] || 0;
        const removed = Math.min(current, count);
        if (removed <= 0) return 0;
        const next = current - removed;
        if (next <= 0) delete card.cultureTokens[culture];
        else card.cultureTokens[culture] = next;
        if (Object.keys(card.cultureTokens).length === 0) {
            delete card.cultureTokens;
        }
        return removed;
    }

    let remaining = count;
    let removedTotal = 0;
    const keys = Object.keys(card.cultureTokens) as CardCulture[];
    for (const key of keys) {
        if (remaining <= 0) break;
        if (
            culture === 'FREE_PEOPLES' &&
            !FREE_PEOPLES_CULTURES.has(key)
        ) {
            continue;
        }
        const current = card.cultureTokens[key] || 0;
        const removed = Math.min(current, remaining);
        if (removed <= 0) continue;
        const next = current - removed;
        if (next <= 0) delete card.cultureTokens[key];
        else card.cultureTokens[key] = next;
        remaining -= removed;
        removedTotal += removed;
    }
    if (
        card.cultureTokens &&
        Object.keys(card.cultureTokens).length === 0
    ) {
        delete card.cultureTokens;
    }
    return removedTotal;
}

/**
 * Propriétaire d’une carte en jeu (fellowship FP, zones de soutien, champ de bataille).
 */
export function findInPlayCardOwnerId(
    G: GameState,
    card: CardState
): string | undefined {
    const targetId = card.instanceId || card.id;
    if (!targetId) return undefined;

    const listHas = (list?: CardState[]): boolean => {
        if (!list) return false;
        for (const item of list) {
            if (!item) continue;
            if (matchCard(item, targetId)) return true;
            if (item.attachments?.some((att) => matchCard(att, targetId))) {
                return true;
            }
        }
        return false;
    };

    const fpId = G.fpPlayerId || '0';
    const shadowId = shadowPlayerId(G);

    if (listHas(G.players[fpId]?.fellowshipArea)) return fpId;

    for (const [playerId, player] of Object.entries(G.players || {})) {
        if (listHas(player.supportArea)) return playerId;
    }

    if (listHas(G.battlefield)) return shadowId;
    return undefined;
}

/** Cartes en jeu appartenant au joueur (actives pour spot / reinforce / remove). */
export function getOwnedInPlayCards(
    G: GameState,
    ownerId: string
): CardState[] {
    const cards: CardState[] = [];
    visitInPlayCards(G, (card) => {
        if (findInPlayCardOwnerId(G, card) === ownerId) {
            cards.push(card);
        }
    });
    return cards;
}

export function countCultureTokensForPlayer(
    G: GameState,
    ownerId: string,
    culture: CultureTokenSpec = 'ANY'
): number {
    return getOwnedInPlayCards(G, ownerId).reduce(
        (sum, card) => sum + tokenCountOnCard(card, culture),
        0
    );
}

/** Cartes du joueur pouvant recevoir un reinforce de cette spécification. */
export function getReinforceCandidates(
    G: GameState,
    ownerId: string,
    culture: CultureTokenSpec
): CardState[] {
    return getOwnedInPlayCards(G, ownerId).filter(
        (card) => resolveReinforceCulture(card, culture) !== null
    );
}

export function canReinforce(
    G: GameState,
    ownerId: string,
    culture: CultureTokenSpec,
    count = 1
): boolean {
    if (count <= 0) return false;
    return getReinforceCandidates(G, ownerId, culture).length > 0;
}

/**
 * Applique N reinforce. `targetIds` : un id = les N sur cette carte ;
 * plusieurs ids (longueur ≤ N) = un jeton par id, le reste sur le dernier.
 */
export function applyReinforce(
    G: GameState,
    ownerId: string,
    culture: CultureTokenSpec,
    count: number,
    targetIds?: string[]
): number {
    if (count <= 0) return 0;
    const candidates = getReinforceCandidates(G, ownerId, culture);
    if (candidates.length === 0) return 0;

    const findCandidate = (id: string) =>
        candidates.find((card) => matchCard(card, id));

    if (!targetIds || targetIds.length === 0) {
        if (candidates.length !== 1) return 0;
        const card = candidates[0];
        const resolved = resolveReinforceCulture(card, culture);
        if (!resolved) return 0;
        return placeCultureTokens(card, resolved, count);
    }

    if (targetIds.length === 1) {
        const card = findCandidate(targetIds[0]);
        if (!card) return 0;
        const resolved = resolveReinforceCulture(card, culture);
        if (!resolved) return 0;
        return placeCultureTokens(card, resolved, count);
    }

    let placed = 0;
    for (let i = 0; i < count; i += 1) {
        const id = targetIds[Math.min(i, targetIds.length - 1)];
        const card = findCandidate(id);
        if (!card) break;
        const resolved = resolveReinforceCulture(card, culture);
        if (!resolved) break;
        placed += placeCultureTokens(card, resolved, 1);
    }
    return placed;
}

/** Retire des jetons depuis SELF ou une carte désignée parmi les éligibles. */
export function removeCultureTokensForPlayer(
    G: GameState,
    ownerId: string,
    culture: CultureTokenSpec,
    count: number,
    options?: { fromSelf?: CardState; targetId?: string }
): number {
    if (count <= 0) return 0;

    if (options?.fromSelf) {
        return removeCultureTokensFromCard(options.fromSelf, culture, count);
    }

    const pool = getOwnedInPlayCards(G, ownerId).filter(
        (card) => tokenCountOnCard(card, culture) > 0
    );
    if (pool.length === 0) return 0;

    if (options?.targetId) {
        const card = pool.find((c) => matchCard(c, options.targetId!));
        if (!card) return 0;
        return removeCultureTokensFromCard(card, culture, count);
    }

    // Une seule carte éligible pour le total demandé → pas de désignation.
    const payable = pool.filter(
        (card) => tokenCountOnCard(card, culture) >= count
    );
    if (payable.length === 1) {
        return removeCultureTokensFromCard(payable[0], culture, count);
    }
    if (pool.length === 1) {
        return removeCultureTokensFromCard(pool[0], culture, count);
    }

    // Plusieurs cartes : désignation attendue en amont.
    return 0;
}

export function abilityOwnerCanSpotCultureTokens(
    G: GameState,
    source: CardState,
    culture: CultureTokenSpec,
    count: number
): boolean {
    const fpId = G.fpPlayerId || '0';
    const ownerId =
        source.kind === 'FREE_PEOPLE'
            ? fpId
            : source.kind === 'SHADOW'
              ? shadowPlayerId(G)
              : undefined;
    if (!ownerId) return false;
    return countCultureTokensForPlayer(G, ownerId, culture) >= count;
}
