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
    token: AbilityTargetRef,
    chosenTargetId?: string
): CardState | null {
    if (token === 'SELF') return source;
    if (token === 'BEARER') return findBearer(G, source);
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
    if (Array.isArray(target)) {
        return resolveDnfTargets(G, target);
    }
    return [];
}
