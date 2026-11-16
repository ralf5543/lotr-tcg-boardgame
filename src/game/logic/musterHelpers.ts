// src/game/helpers/musterHelpers.ts
import type { GameState, CardState } from '../types';
import { getKeywordValue } from '../engine/keywords/keywordUtils';

function cardHasMuster(card: CardState): boolean {
    if (!card) return false;
    if (getKeywordValue(card, 'MUSTER') >= 0) return true;
    return (
        card.grantsKeywords?.some((k) =>
            k.toUpperCase().startsWith('MUSTER')
        ) ?? false
    );
}

export function getMusterCount(G: GameState, playerId: string): number {
    const player = G.players?.[playerId];
    if (!player) return 0;

    let count = 0;
    const isFP = playerId === G.fpPlayerId;

    // 1. Peuples Libres (aire de Compagnie)
    if (isFP) {
        (player.fellowshipArea || []).forEach((card: CardState) => {
            if (cardHasMuster(card)) count++;
        });
    } else {
        // 2. Ombre (Champ de bataille)
        (G.battlefield || []).forEach((card: CardState) => {
            if (cardHasMuster(card)) count++;
        });
    }

    return count;
}

/**
 * Frodon « gain muster » (et assimilés) : le comptage initial de début de
 * ralliement est déjà fait — on recalcule allowedCount pour le joueur.
 * Ouvre / rouvre l’étape MUSTER_STEP si besoin.
 */
export function syncMusterStateAfterGain(G: GameState, playerId: string): void {
    const pid = String(playerId);
    const count = getMusterCount(G, pid);
    if (count <= 0) return;

    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    if (!G.musterState) {
        G.musterState = {
            players: {
                [fpId]: {
                    allowedCount: pid === fpId ? count : getMusterCount(G, fpId),
                    discardedCount: 0,
                    isDone:
                        (pid === fpId ? count : getMusterCount(G, fpId)) === 0,
                },
                [shadowId]: {
                    allowedCount:
                        pid === shadowId
                            ? count
                            : getMusterCount(G, shadowId),
                    discardedCount: 0,
                    isDone:
                        (pid === shadowId
                            ? count
                            : getMusterCount(G, shadowId)) === 0,
                },
            },
        };
        G.regroupStep = 'MUSTER_STEP';
        return;
    }

    const slot = G.musterState.players?.[pid];
    if (!slot) {
        G.musterState.players[pid] = {
            allowedCount: count,
            discardedCount: 0,
            isDone: false,
        };
    } else {
        slot.allowedCount = Math.max(slot.allowedCount, count);
        if (slot.discardedCount < slot.allowedCount) {
            slot.isDone = false;
        }
    }
    if (
        G.regroupStep !== 'MUSTER_STEP' &&
        G.regroupStep !== 'START_OF_REGROUP'
    ) {
        // Déjà passé à autre chose : ne pas forcer le retour.
        return;
    }
    G.regroupStep = 'MUSTER_STEP';
}
