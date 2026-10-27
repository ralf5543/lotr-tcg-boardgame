/**
 * Reprise du déplacement après le choix du site **quitté**
 * (Moria Guardroom / Osgiliath Reclaimed) : l’effet optionnel de départ
 * a été proposé AVANT le déplacement ; une fois le choix résolu, on
 * exécute ici la continuation suspendue (pose / fin de fellowship /
 * déplacement de regroupement). Les fenêtres d’arrivée sont ensuite
 * enchaînées par `resolvePendingSiteMoveAbility` (branche départ).
 */

import type { GameState, LotrMoveContext } from '../types';
import {
    advanceCompany,
    afterFellowshipArrived,
    playSite,
} from '../moves/fellowshipMoves';
import { tryOpenFellowshipMoves } from '../engine/responseWindow';
import { beginSiteMoveCharacterWoundsIfNeeded } from './siteMoveCharacterWounds';
import { beginDeadPileRemovalIfNeeded } from './siteDeadPileRemoval';
import { beginOptionalSiteMoveAbility } from './siteMoveAbility';
import { enterPhase } from './phaseEntry';

type DepartureContinuation = NonNullable<
    GameState['pendingSiteDepartureContinuation']
>;

/**
 * Exécute la continuation suspendue. Ne doit être appelé qu’une fois le
 * pending du site quitté résolu (pending déjà effacé).
 */
export function resumeSiteDepartureContinuation(
    ctx: LotrMoveContext,
    continuation: DepartureContinuation
): void {
    const { G, events } = ctx as unknown as {
        G: GameState;
        events?: { setPhase?: (phase: string) => void };
    };
    G.pendingSiteDepartureContinuation = undefined;

    if (continuation.kind === 'PLAY_SITE') {
        // La pose rejoue les gardes (joueur de l’Ombre, emplacement libre).
        // Elle ne rouvrira pas la fenêtre de départ : le site courant est
        // inchangé donc la capacité de départ serait re-proposée… garde
        // ci-dessous : on neutralise en consommant via le garde-fou.
        playSite(
            ctx as Parameters<typeof playSite>[0],
            continuation.siteId,
            continuation.targetIndex
        );
        return;
    }

    if (continuation.kind === 'END_FELLOWSHIP_PHASE') {
        // Même fin que endFellowshipPhase après advanceCompany.
        advanceCompany(G);

        if (!G.awaitingSiteSelection) {
            const next = enterPhase('shadow');
            if (beginSiteMoveCharacterWoundsIfNeeded(G, next)) {
                return;
            }
            if (beginDeadPileRemovalIfNeeded(G, next)) {
                return;
            }
            if (beginOptionalSiteMoveAbility(G, next)) {
                return;
            }
            afterFellowshipArrived(G, events, next);
        }
        return;
    }

    // MOVE_NEXT_SITE (regroupement) : même fin que moveNextSite.
    advanceCompany(G);
    G.forceChooseMoveAgain = false;
    if (!G.awaitingSiteSelection) {
        G.skirmishes = [];
        G.activeSkirmishId = undefined;
        if (beginSiteMoveCharacterWoundsIfNeeded(G, 'startOfShadow')) {
            return;
        }
        if (beginDeadPileRemovalIfNeeded(G, 'startOfShadow')) {
            return;
        }
        if (beginOptionalSiteMoveAbility(G, 'startOfShadow')) {
            return;
        }
        if (tryOpenFellowshipMoves(G) === 'WAITING') {
            G.pendingPhaseAfterResponse = 'startOfShadow';
        } else {
            events?.setPhase?.('startOfShadow');
        }
    }
}
