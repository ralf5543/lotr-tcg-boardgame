import type { Ability, CardState, GameState, SiteCardState } from '../types';
import { triggerConditionsMet } from '../engine/abilities/siteMove';
import { tryOpenFellowshipMoves } from '../engine/responseWindow';
import { getCurrentSite } from './sites';
import { beginOptionalSiteMoveAbility } from './siteMoveAbility';

type PhaseEvents = {
    setPhase?: (phase: string) => void;
};

function findDeadPileRemovalAbility(
    G: GameState,
    site: SiteCardState | null
): Ability | null {
    if (!site?.abilities?.length) return null;
    for (const ability of site.abilities) {
        if (ability.optional) continue;
        if (ability.trigger?.type !== 'MOVES_TO') continue;
        if (!triggerConditionsMet(G, site, ability)) continue;
        if (
            (ability.effects || []).some(
                (effect) => effect.type === 'REMOVE_DEAD_PILE_CARD_FROM_GAME'
            )
        ) {
            return ability;
        }
    }
    return null;
}

/** Cartes que le joueur FP peut placer hors jeu (sa pile de mort). */
export function getDeadPileRemovalCandidates(
    G: GameState,
    playerId: string
): CardState[] {
    return G.players[playerId]?.deadPile || [];
}

/** Suite normale du déplacement une fois le choix fait. */
function resumeAfterDeadPileRemoval(
    G: GameState,
    events: PhaseEvents | undefined,
    nextPhase?: string
): void {
    if (beginOptionalSiteMoveAbility(G, nextPhase)) {
        return;
    }
    if (tryOpenFellowshipMoves(G) === 'WAITING') {
        if (nextPhase) G.pendingPhaseAfterResponse = nextPhase;
        return;
    }
    if (nextPhase) events?.setPhase?.(nextPhase);
}

/**
 * Falls of Rauros : à l’arrivée (région exigée par le déclencheur), le FP
 * place une carte de sa pile de mort hors jeu.
 * Retourne true si un choix est en cours (ne pas enchaîner la phase).
 * Pile de mort vide → rien à placer, le flux continue.
 */
export function beginDeadPileRemovalIfNeeded(
    G: GameState,
    nextPhase?: string
): boolean {
    if (G.pendingDeadPileRemoval) return true;
    const site = getCurrentSite(G);
    const ability = findDeadPileRemovalAbility(G, site);
    if (!ability || !site) return false;

    const fpId = G.fpPlayerId || '0';
    if (getDeadPileRemovalCandidates(G, fpId).length === 0) return false;

    G.pendingDeadPileRemoval = {
        playerId: fpId,
        siteInstanceId:
            (site as SiteCardState & { instanceId?: string }).instanceId ||
            site.id,
        abilityId: ability.id,
        pendingPhaseAfter: nextPhase,
    };
    G.statusMessage =
        'Falls of Rauros : placez une carte de votre pile de mort hors jeu.';
    return true;
}

/** Le FP désigne la carte de sa pile de mort à retirer du jeu. */
export function resolveDeadPileRemoval(
    G: GameState,
    playerID: string,
    cardId: string,
    events?: PhaseEvents
): boolean {
    const pending = G.pendingDeadPileRemoval;
    if (!pending || pending.playerId !== playerID) return false;

    const fp = G.players[playerID];
    if (!fp) return false;
    const index = (fp.deadPile || []).findIndex(
        (card) => card.instanceId === cardId || card.id === cardId
    );
    if (index < 0) return false;

    const [card] = fp.deadPile.splice(index, 1);
    fp.removedFromGame = fp.removedFromGame || [];
    fp.removedFromGame.push(card);

    const site = getCurrentSite(G);
    G.statusMessage = `${site?.name || 'Site'} : ${card.title || card.id} est retiré du jeu.`;

    const nextPhase = pending.pendingPhaseAfter;
    G.pendingDeadPileRemoval = undefined;
    resumeAfterDeadPileRemoval(G, events, nextPhase);
    return true;
}
