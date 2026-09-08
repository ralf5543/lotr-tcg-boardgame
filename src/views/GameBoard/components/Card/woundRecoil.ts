import type { Faction } from '../../../../contexts/FactionContext';
import type { CardKind } from '../../../../game/types';

/**
 * Recul d’impact : toujours du point de vue du joueur local.
 * Ses persos (compagnons ou séides) partent vers le bas, ceux de l’adversaire vers le haut.
 */
export function isWoundRecoilDown(
    kind: CardKind | undefined,
    localFaction: Faction,
    isOpponent = false
): boolean {
    if (kind === 'FREE_PEOPLE') return localFaction === 'FREE_PEOPLE';
    if (kind === 'SHADOW') return localFaction === 'SHADOW';
    return !isOpponent;
}
