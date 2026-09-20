import type { GameState } from '../types';

export function canActInActionWindow(
    G: GameState,
    playerID: string
): boolean {
    const pid = String(playerID);
    if (G.responseWindow?.isOpen) {
        return String(G.responseWindow.activePlayerId) === pid;
    }
    if (!G.actionWindow?.isOpen) return true;
    return String(G.actionWindow.activePlayerId) === pid;
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
    const pid = String(playerID);
    if (String(G.actionWindow.activePlayerId) !== pid) return;

    const otherPlayer = pid === '0' ? '1' : '0';
    const fpId = G.fpPlayerId || '0';
    G.actionWindow = {
        ...G.actionWindow,
        activePlayerId: otherPlayer,
        passesCount: 0,
        message: `Au tour du joueur ${otherPlayer === fpId ? 'FP' : 'Ombre'} d’agir ou de passer.`,
    };
}
