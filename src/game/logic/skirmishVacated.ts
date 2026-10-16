import type { CardState, GameState, SkirmishState } from '../types';
import { getEffectiveVitality } from '../../utils/cardStats';
import { cancelSkirmish } from '../engine/abilities/cancelSkirmish';
import {
    tryOpenCharacterDies,
    tryOpenLosesSkirmish,
    tryOpenWinsSkirmish,
} from '../engine/responseWindow';
import { clearExpiredTempKeywords } from '../engine/abilities/applyAbilityEffect';

function matchId(card: CardState, id: string): boolean {
    return card.instanceId === id || card.id === id;
}

function findCompanion(
    G: GameState,
    companionId: string
): CardState | null {
    const fpId = G.fpPlayerId || '0';
    return (
        (G.players[fpId]?.fellowshipArea || []).find((c) =>
            matchId(c, companionId)
        ) || null
    );
}

function aliveMinions(G: GameState, skirmish: SkirmishState): CardState[] {
    return (G.battlefield || []).filter(
        (c) =>
            (skirmish.minionIds.includes(c.id) ||
                skirmish.minionIds.includes(c.instanceId || '')) &&
            !c.isDead &&
            getEffectiveVitality(c) > 0
    );
}

function companionAlive(companion: CardState | null): boolean {
    return Boolean(
        companion && !companion.isDead && getEffectiveVitality(companion) > 0
    );
}

function skirmishInvolves(skirmish: SkirmishState, cardId: string): boolean {
    if (skirmish.companionId === cardId) return true;
    return skirmish.minionIds.some((id) => id === cardId);
}

/**
 * Après défausse d’un combattant : fin sans vainqueur.
 * Après mort : si un seul côté reste, il gagne (réponses WINS/LOSES).
 */
export function reconcileActiveSkirmishAfterLeave(
    G: GameState,
    leftCardId: string,
    reason: 'DEATH' | 'DISCARD'
): void {
    if (!G.activeSkirmishId) return;
    if (G.responseWindow?.isOpen || G.pendingEvent) return;

    const skirmishIndex = (G.skirmishes || []).findIndex(
        (s) => s.id === G.activeSkirmishId
    );
    if (skirmishIndex < 0) return;
    const skirmish = G.skirmishes[skirmishIndex];
    if (!skirmish || skirmish.resolved) return;
    if (!skirmishInvolves(skirmish, leftCardId)) return;

    if (reason === 'DISCARD') {
        cancelSkirmish(G, skirmish.id);
        G.statusMessage =
            'Escarmouche terminée : un combattant a quitté le combat (défausse). Pas de vainqueur.';
        return;
    }

    const companion = findCompanion(G, skirmish.companionId);
    const minions = aliveMinions(G, skirmish);
    const fpAlive = companionAlive(companion);

    if (fpAlive && minions.length > 0) return;

    if (fpAlive && minions.length === 0 && companion) {
        skirmish.resolved = true;
        const winnerId = companion.instanceId || companion.id;
        G.pendingWinsSkirmish = {
            winnerIds: [winnerId],
            skirmishId: skirmish.id,
        };
        G.pendingLosesSkirmish = {
            loserIds: [...skirmish.minionIds],
            skirmishId: skirmish.id,
        };
        G.actionWindow = undefined;
        G.statusMessage =
            'Escarmouche terminée : plus de séide en face — victoire des Peuples Libres.';
        if (tryOpenCharacterDies(G) === 'WAITING') return;
        if (tryOpenWinsSkirmish(G) === 'WAITING') return;
        tryOpenLosesSkirmish(G);
        return;
    }

    if (!fpAlive && minions.length > 0) {
        skirmish.resolved = true;
        G.pendingWinsSkirmish = {
            winnerIds: minions.map((m) => m.instanceId || m.id),
            skirmishId: skirmish.id,
        };
        G.pendingLosesSkirmish = {
            loserIds: [skirmish.companionId],
            skirmishId: skirmish.id,
        };
        G.actionWindow = undefined;
        G.statusMessage =
            'Escarmouche terminée : le compagnon est mort — victoire de l’Ombre.';
        if (tryOpenCharacterDies(G) === 'WAITING') return;
        if (tryOpenWinsSkirmish(G) === 'WAITING') return;
        tryOpenLosesSkirmish(G);
        return;
    }

    // Les deux côtés vides
    G.skirmishes.splice(skirmishIndex, 1);
    G.activeSkirmishId = undefined;
    G.actionWindow = undefined;
    clearExpiredTempKeywords(G, 'SKIRMISH');
    G.statusMessage = 'Escarmouche terminée : plus de combattants.';
}
