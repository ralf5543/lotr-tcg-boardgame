import type { GameState } from '../types';

/**
 * Fenêtre d’actions d’un combat en cours (après selectSkirmish, avant les deux Passer).
 * Les actions « Skirmish: » se jouent ici, pas pendant toute la phase.
 */
export function isSkirmishActionWindowOpen(G: GameState): boolean {
    return Boolean(G.activeSkirmishId && G.actionWindow?.isOpen);
}
