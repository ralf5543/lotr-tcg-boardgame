import type {
    AbilityTargetRef,
    CardState,
    CostSelector,
    GameState,
} from '../../types';
import { cardMatchesTarget } from '../validations/matchers';

const matchCard = (c: CardState | undefined | null, targetId: string) =>
    Boolean(c && (c.instanceId === targetId || c.id === targetId));

/**
 * Parcourt toutes les cartes en jeu (fellowship, support, battlefield + attachments).
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

    Object.values(G.players || {}).forEach((player) => {
        visitList(player.fellowshipArea);
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

function resolveDnfTargets(G: GameState, target: string[][]): CardState[] {
    const matches: CardState[] = [];
    forEachInPlayCard(G, (card) => {
        if (cardMatchesTarget(card, target)) matches.push(card);
    });
    return matches;
}

export function resolveAbilityTarget(
    G: GameState,
    source: CardState,
    token: AbilityTargetRef
): CardState | null {
    if (token === 'SELF') return source;
    if (token === 'BEARER') return findBearer(G, source);
    if (Array.isArray(token)) {
        return resolveDnfTargets(G, token)[0] || null;
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
    if (Array.isArray(target)) {
        return resolveDnfTargets(G, target);
    }
    return [];
}
