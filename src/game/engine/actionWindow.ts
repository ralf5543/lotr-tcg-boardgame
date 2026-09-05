import type { GameState } from '../types';

export function canActInActionWindow(
    G: GameState,
    playerID: string
): boolean {
    if (!G.actionWindow?.isOpen) return true;
    return G.actionWindow.activePlayerId === playerID;
}

/**
 * Après une action (carte / capacité), la priorité passe à l’adversaire.
 * Ce n’est pas un Passer : le compteur de passes consécutives retombe à 0.
 */
export function yieldPriorityAfterAction(
    G: GameState,
    playerID: string
): void {
    if (!G.actionWindow?.isOpen) return;
    if (G.actionWindow.activePlayerId !== playerID) return;

    const otherPlayer = playerID === '0' ? '1' : '0';
    const fpId = G.fpPlayerId || '0';
    G.actionWindow = {
        ...G.actionWindow,
        activePlayerId: otherPlayer,
        passesCount: 0,
        message: `Au tour du joueur ${otherPlayer === fpId ? 'FP' : 'Ombre'} d’agir ou de passer.`,
    };
}
