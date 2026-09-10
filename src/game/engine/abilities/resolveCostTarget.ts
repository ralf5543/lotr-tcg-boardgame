import type {
    Ability,
    AbilityTargetRef,
    AbilityTrigger,
    CardState,
    CostSelector,
    GameState,
} from '../../types';
import { cardMatchesTarget } from '../validations/matchers';

const matchCard = (c: CardState | undefined | null, targetId: string) =>
    Boolean(c && (c.instanceId === targetId || c.id === targetId));

/**
 * Parcourt les cartes réellement en jeu : compagnie des Peuples Libres,
 * zones de soutien, champ de bataille (+ attachements).
 * La fellowship de l’Ombre n’est pas en jeu (reste de setup / bandeau dormant).
 */
export function forEachInPlayCard(
    G: GameState,
    visit: (card: CardState, bearer?: CardState) => void
): void {
    const visitList = (list?: CardState[]) => {
        if (!list) return;
        list.forEach((card) => {
            if (!card) return;
            visit(card);
            card.attachments?.forEach((att) => {
                if (att) visit(att, card);
            });
        });
    };

    const fpId = G.fpPlayerId || '0';
    visitList(G.players?.[fpId]?.fellowshipArea);

    Object.values(G.players || {}).forEach((player) => {
        visitList(player.supportArea);
    });
    visitList(G.battlefield);
}

export function findBearer(
    G: GameState,
    attachment: CardState
): CardState | null {
    const attachmentId = attachment.instanceId || attachment.id;
    let found: CardState | null = null;

    forEachInPlayCard(G, (card, bearer) => {
        if (found || !bearer) return;
        if (matchCard(card, attachmentId)) {
            found = bearer;
        }
    });

    return found;
}

export function resolveSkirmishingOpponents(
    G: GameState,
    source: CardState
): CardState[] {
    const bearer = findBearer(G, source);
    const fighter = bearer || source;
    const fighterId = fighter.instanceId || fighter.id;

    const involves = (skirmish: {
        id?: string;
        companionId?: string;
        minionIds?: string[];
        minionId?: string;
    }) => {
        if (skirmish.companionId === fighterId) return true;
        const minionIds =
            skirmish.minionIds ||
            (skirmish.minionId ? [skirmish.minionId] : []);
        return minionIds.includes(fighterId);
    };

    const active = (G.skirmishes || []).find(
        (skirmish) =>
            skirmish.id === G.activeSkirmishId && involves(skirmish)
    );
    const skirmish =
        active || (G.skirmishes || []).find((item) => involves(item));
    if (!skirmish) return [];

    const fpId = G.fpPlayerId || '0';
    const companion = (G.players[fpId]?.fellowshipArea || []).find(
        (card) =>
            (card.instanceId || card.id) === skirmish.companionId &&
            !card.isDead
    );
    const minionIds =
        skirmish.minionIds ||
        (skirmish.minionId ? [skirmish.minionId] : []);
    const minions = (G.battlefield || []).filter(
        (card) =>
            !card.isDead &&
            minionIds.includes(card.instanceId || card.id)
    );

    if (fighter.kind === 'SHADOW' || fighter.type === 'MINION') {
        return companion ? [companion] : [];
    }
    return minions;
}

function resolveDnfTargets(G: GameState, target: string[][]): CardState[] {
    const matches: CardState[] = [];
    forEachInPlayCard(G, (card) => {
        if (cardMatchesTarget(card, target)) matches.push(card);
    });
    return matches;
}

function findInPlayCard(
    G: GameState,
    targetId: string
): CardState | null {
    let found: CardState | null = null;
    forEachInPlayCard(G, (card) => {
        if (!found && matchCard(card, targetId)) found = card;
    });
    return found;
}

export function cardMatchesWinsSkirmishWinner(
    G: GameState,
    source: CardState,
    winner: CardState,
    trigger: Extract<AbilityTrigger, { type: 'WINS_SKIRMISH' }>
): boolean {
    if (trigger.yours && source.kind !== winner.kind) return false;
    const target = trigger.winner;
    if (target === 'SELF') {
        return matchCard(winner, source.instanceId || source.id);
    }
    if (target === 'BEARER') {
        const bearer = findBearer(G, source);
        return Boolean(
            bearer && matchCard(winner, bearer.instanceId || bearer.id)
        );
    }
    if (target === 'WINNER' || target === 'SKIRMISHING') return false;
    if (Array.isArray(target)) return cardMatchesTarget(winner, target);
    return false;
}

export function resolveWinnerTargets(
    G: GameState,
    source: CardState,
    ability: Ability
): CardState[] {
    const event = G.pendingEvent;
    if (!event || event.type !== 'WINS_SKIRMISH') return [];
    const trigger = ability.trigger;
    if (!trigger || trigger.type !== 'WINS_SKIRMISH') return [];

    const matches: CardState[] = [];
    for (const winnerId of event.winnerIds) {
        const winner = findInPlayCard(G, winnerId);
        if (!winner || winner.isDead) continue;
        if (cardMatchesWinsSkirmishWinner(G, source, winner, trigger)) {
            matches.push(winner);
        }
    }
    return matches;
}

export function resolveAbilityTarget(
    G: GameState,
    source: CardState,
    token: AbilityTargetRef,
    chosenTargetId?: string
): CardState | null {
    if (token === 'SELF') return source;
    if (token === 'BEARER') return findBearer(G, source);
    if (token === 'WINNER') {
        const event = G.pendingEvent;
        if (!event || event.type !== 'WINS_SKIRMISH') return null;
        const winners = event.winnerIds
            .map((id) => findInPlayCard(G, id))
            .filter((card): card is CardState => Boolean(card && !card.isDead));
        if (chosenTargetId) {
            return (
                winners.find((card) => matchCard(card, chosenTargetId)) || null
            );
        }
        if (winners.length === 1) return winners[0];
        return null;
    }
    if (token === 'SKIRMISHING') {
        const matches = resolveSkirmishingOpponents(G, source);
        if (chosenTargetId) {
            return matches.find((card) => matchCard(card, chosenTargetId)) || null;
        }
        if (matches.length === 1) return matches[0];
        return null;
    }
    if (Array.isArray(token)) {
        const matches = resolveDnfTargets(G, token);
        if (chosenTargetId) {
            return matches.find((card) => matchCard(card, chosenTargetId)) || null;
        }
        if (matches.length === 1) return matches[0];
        return null;
    }
    return null;
}

export function resolveCostTarget(
    G: GameState,
    source: CardState,
    target: CostSelector['target']
): CardState[] {
    if (target === 'SELF') return [source];
    if (target === 'BEARER') {
        const bearer = findBearer(G, source);
        return bearer ? [bearer] : [];
    }
    if (target === 'SKIRMISHING') {
        return resolveSkirmishingOpponents(G, source);
    }
    if (target === 'WINNER') {
        const event = G.pendingEvent;
        if (!event || event.type !== 'WINS_SKIRMISH') return [];
        return event.winnerIds
            .map((id) => findInPlayCard(G, id))
            .filter((card): card is CardState => Boolean(card && !card.isDead));
    }
    if (Array.isArray(target)) {
        return resolveDnfTargets(G, target);
    }
    return [];
}
