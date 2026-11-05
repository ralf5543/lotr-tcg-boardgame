import type { Ctx } from 'boardgame.io';
import type { CardState, GameState } from '../types';
import {
    canCompanionBeAssigned,
    getAssignableMinionCapacity,
    getSiteMaxMinionsPerSkirmish,
    getUnassignedMinions,
} from '../logic/assignment';
import { canCardTakeWound } from '../logic/sites';
import { getEffectiveVitality } from '../../utils/cardStats';
import { getMoveLimit } from '../logic/moveLimit';
import { getSitePhaseDesignationCandidates } from '../logic/sitePhaseAbility';
import {
    canAttachToCharacter,
    canDropInSupportArea,
    canPlayCard,
    requiresAttachmentTarget,
} from '../engine/canPlayCard';
import { getToPlayExertTargetIds } from '../engine/abilities/designation';
import { fpPlayerId, isBotToAct, shadowPlayerId } from './isBotToAct';

/** Format attendu par boardgame.io `game.ai.enumerate`. */
export type BotMoveSpec = { move: string; args?: unknown[] };

function skirmishMinionCount(G: GameState, companion: CardState): number {
    const id = companion.instanceId || companion.id;
    const skirmish = (G.skirmishes || []).find(
        (s) =>
            s.companionId === id ||
            s.companionId === companion.id ||
            s.companionId === companion.instanceId
    );
    return skirmish?.minionIds.length ?? 0;
}

/**
 * Compagnon avec encore de la place (capacité FP / plafond site pour l’Ombre).
 * Sinon null → yield / pass, pas un assignMinion qui boucle en INVALID.
 */
function companionWithFreeSlotId(
    G: GameState,
    forFreePeoples: boolean
): string | null {
    const fp = fpPlayerId(G);
    const comps = (G.players[fp]?.fellowshipArea || []).filter(
        (c) => canCompanionBeAssigned(c) && !c.isDead
    );
    const siteCap = getSiteMaxMinionsPerSkirmish(G);

    for (const c of comps) {
        const assigned = skirmishMinionCount(G, c);
        const max = forFreePeoples
            ? getAssignableMinionCapacity(c, G)
            : siteCap == null
              ? Number.POSITIVE_INFINITY
              : siteCap;
        if (assigned < max) {
            return c.instanceId || c.id;
        }
    }
    return null;
}

function livingMinions(G: GameState): CardState[] {
    return (G.battlefield || []).filter(
        (c) =>
            c.kind === 'SHADOW' &&
            c.type === 'MINION' &&
            !c.isDead &&
            getEffectiveVitality(c) > 0 &&
            canCardTakeWound(G, c)
    );
}

function livingCompanions(G: GameState): CardState[] {
    const fp = fpPlayerId(G);
    return (G.players[fp]?.fellowshipArea || []).filter(
        (c) => !c.isDead && getEffectiveVitality(c) > 0
    );
}

/** Coups Ombre légaux (canPlayCard) : séides / conditions / attachements. */
function shadowPlayMoves(
    G: GameState,
    ctx: Ctx,
    playerID: string
): BotMoveSpec[] {
    const player = G.players[playerID];
    if (!player?.hand) return [];
    const context = { G, ctx, playerID };
    const hosts = G.battlefield || [];
    const specs: BotMoveSpec[] = [];

    player.hand.forEach((card, index) => {
        if (!card || card.kind !== 'SHADOW') return;
        if (card.type === 'EVENT' || card.type === 'SITE') return;

        if (requiresAttachmentTarget(card)) {
            for (const host of hosts) {
                const hostId = host.instanceId || host.id;
                if (!canAttachToCharacter(card, host, playerID)) continue;
                if (!canPlayCard(card, context, hostId, host).valid) continue;
                specs.push({
                    move: 'attachCard',
                    args: [index, hostId],
                });
                return;
            }
            return;
        }

        if (!canPlayCard(card, context).valid) return;

        // Affaiblissement à désigner (Worry…) → playCard + cible.
        if (hasDesignatedExertCost(card)) {
            const costId = getToPlayExertTargetIds(G, card)[0];
            if (!costId) return;
            specs.push({ move: 'playCard', args: [index, costId] });
            return;
        }

        if (
            card.type === 'MINION' ||
            card.type === 'CONDITION' ||
            card.type === 'SHADOW_SUPPORT' ||
            canDropInSupportArea(card)
        ) {
            // playShadowCard : coût d’errance / battlefield ; validé côté move.
            specs.push({ move: 'playShadowCard', args: [index] });
        }
    });

    return specs;
}

function hasDesignatedExertCost(card: CardState): boolean {
    return (card.toPlay || []).some((opt) =>
        opt.exert?.some((r) => Array.isArray(r.target))
    );
}

/** Coups PL naïfs : compagnons / soutien / attachements simples (pas d’événements). */
function fellowshipPlayMoves(
    G: GameState,
    ctx: Ctx,
    playerID: string
): BotMoveSpec[] {
    const player = G.players[playerID];
    if (!player?.hand) return [];
    const context = { G, ctx, playerID };
    const hosts = [
        ...(player.fellowshipArea || []),
        ...(player.supportArea || []),
    ];
    const specs: BotMoveSpec[] = [];

    player.hand.forEach((card, index) => {
        if (!card || card.kind === 'SHADOW' || card.type === 'SITE') return;
        // Événements / coûts à désigner : trop de cas → ignorer en v1.
        if (card.type === 'EVENT' || hasDesignatedExertCost(card)) return;

        if (requiresAttachmentTarget(card)) {
            for (const host of hosts) {
                const hostId = host.instanceId || host.id;
                if (!canAttachToCharacter(card, host, playerID)) continue;
                if (
                    !canPlayCard(card, context, hostId, host).valid
                ) {
                    continue;
                }
                specs.push({
                    move: 'attachCard',
                    args: [index, hostId],
                });
                return;
            }
            return;
        }

        if (
            card.type !== 'COMPANION' &&
            !canDropInSupportArea(card)
        ) {
            return;
        }
        if (!canPlayCard(card, context).valid) return;
        specs.push({ move: 'playCard', args: [index] });
    });

    return specs;
}

/**
 * Liste priorisée des coups du BOT playtest.
 * Un seul « fil » à la fois : le premier coup de la liste est le préféré.
 */
export function enumerateBotMoves(
    G: GameState,
    ctx: Ctx,
    playerID: string
): BotMoveSpec[] {
    if (!isBotToAct(G, ctx, playerID)) return [];

    const moves: BotMoveSpec[] = [];
    const phase = ctx.phase || '';
    const fp = fpPlayerId(G);
    const shadow = shadowPlayerId(G);

    // --- Pendings / fenêtres (passer plutôt qu’activer) ---
    if (G.pendingForcedChoice?.playerId === playerID) {
        moves.push({ move: 'resolveForcedChoiceMove', args: [0] });
        if (G.pendingForcedChoice.cancelable) {
            moves.push({ move: 'cancelForcedChoiceMove', args: [] });
        }
        return moves;
    }

    if (G.pendingWhenPlayed?.playerId === playerID) {
        moves.push({ move: 'resolveWhenPlayedChoice', args: [false] });
        return moves;
    }

    if (G.pendingSiteStartAbility?.playerId === playerID) {
        moves.push({ move: 'resolveSiteStartAbilityChoice', args: [false] });
        return moves;
    }

    if (G.pendingSiteMoveAbility?.playerId === playerID) {
        moves.push({ move: 'resolveSiteMoveAbilityChoice', args: [false] });
        return moves;
    }

    if (G.pendingSitePhaseAbility?.playerId === playerID) {
        moves.push({ move: 'resolveSitePhaseAbilityChoice', args: [false] });
        return moves;
    }

    if (G.pendingSitePhaseDesignation?.playerId === playerID) {
        const target = getSitePhaseDesignationCandidates(G)[0];
        if (target) {
            moves.push({
                move: 'resolveSitePhaseDesignationChoice',
                args: [target.instanceId || target.id],
            });
        }
        return moves;
    }

    if (G.pendingSiteFollowerTransfer?.playerId === playerID) {
        moves.push({
            move: 'resolveSiteFollowerTransferAbilityChoice',
            args: [false],
        });
        return moves;
    }

    if (G.responseWindow?.isOpen && G.responseWindow.activePlayerId === playerID) {
        moves.push({ move: 'passResponseWindow', args: [] });
        return moves;
    }

    if (G.actionWindow?.isOpen && G.actionWindow.activePlayerId === playerID) {
        moves.push({ move: 'passActionWindow', args: [] });
        return moves;
    }

    // --- Setup ---
    if (phase === 'setup' && G.setupState) {
        const step = G.setupState.step;
        if (step === 'BIDDING') {
            moves.push({ move: 'submitBid', args: [0] });
            return moves;
        }
        if (step === 'CHOOSING_FIRST') {
            // Humain reste PL en premier tour si le BOT gagne l’enchère.
            moves.push({ move: 'chooseFirstPlayer', args: [false] });
            return moves;
        }
        if (step === 'AWAITING_SITE' && playerID === fp) {
            const site = G.players[playerID]?.sitesDeck?.[0];
            if (site) {
                moves.push({ move: 'selectStartingSite', args: [site] });
            }
            return moves;
        }
        if (step === 'MULLIGAN') {
            moves.push({ move: 'submitMulliganChoice', args: [false] });
            return moves;
        }
    }

    // --- Pose de site (avancée) ---
    if (G.awaitingSiteSelection) {
        const nextEmpty = G.path.findIndex((slot) => slot === null);
        if (nextEmpty >= 0) {
            const site = G.players[playerID]?.sitesDeck?.[0];
            if (site) {
                moves.push({
                    move: 'playSite',
                    args: [site.id, nextEmpty],
                });
            }
        }
        return moves;
    }

    // --- Blessures menaces / archerie / sanctuaire ---
    if ((G.threatWoundsToAssign ?? 0) > 0 && playerID === fp) {
        const target = livingCompanions(G)[0];
        if (target) {
            moves.push({
                move: 'assignThreatWound',
                args: [target.instanceId || target.id],
            });
        }
        return moves;
    }

    if (G.sanctuaryHeal && playerID === fp) {
        moves.push({ move: 'confirmSanctuaryHeals', args: [] });
        return moves;
    }

    if (phase === 'archery') {
        const archeryStep = G.archeryAssignStep || G.archeryState?.step;
        if (
            (archeryStep === 'SHADOW' || archeryStep === 'SHADOW_ASSIGN') &&
            playerID === shadow
        ) {
            const target = livingMinions(G)[0];
            if (target) {
                moves.push({
                    move: 'assignArcheryWound',
                    args: [target.instanceId || target.id],
                });
            }
            return moves;
        }
        if (
            (archeryStep === 'FP' || archeryStep === 'FP_ASSIGN') &&
            playerID === fp
        ) {
            const target = livingCompanions(G)[0];
            if (target) {
                moves.push({
                    move: 'assignArcheryWound',
                    args: [target.instanceId || target.id],
                });
            }
            return moves;
        }
    }

    // --- Assignment (uniquement en phase assignment : FP_ASSIGN fantôme sinon) ---
    if (phase === 'assignment') {
        if (G.assignmentStep === 'FP_ASSIGN' && playerID === fp) {
            const unassigned = getUnassignedMinions(G);
            const companionId = companionWithFreeSlotId(G, true);
            // Naïf : le PL affecte tant qu’il reste de la place ; sinon cède à l’Ombre.
            if (unassigned.length > 0 && companionId) {
                const m = unassigned[0]!;
                moves.push({
                    move: 'assignMinion',
                    args: [m.instanceId || m.id, companionId],
                });
            } else if (unassigned.length > 0) {
                moves.push({ move: 'yieldAssignmentToShadow', args: [] });
            }
            return moves;
        }

        if (G.assignmentStep === 'SHADOW_ASSIGN' && playerID === shadow) {
            const unassigned = getUnassignedMinions(G);
            const companionId = companionWithFreeSlotId(G, false);
            if (unassigned.length > 0 && companionId) {
                const m = unassigned[0]!;
                moves.push({
                    move: 'assignMinion',
                    args: [m.instanceId || m.id, companionId],
                });
            } else {
                moves.push({ move: 'passShadowAssignment', args: [] });
            }
            return moves;
        }
    }

    // --- Phase Ombre ---
    if (phase === 'shadow' && playerID === shadow) {
        // Toaster site encore ouvert (sécurité si playerId mal typé plus haut).
        if (G.pendingSitePhaseAbility) {
            moves.push({
                move: 'resolveSitePhaseAbilityChoice',
                args: [false],
            });
            return moves;
        }
        if (G.pendingSitePhaseDesignation) {
            const target = getSitePhaseDesignationCandidates(G)[0];
            if (target) {
                moves.push({
                    move: 'resolveSitePhaseDesignationChoice',
                    args: [target.instanceId || target.id],
                });
            }
            return moves;
        }
        const playables = shadowPlayMoves(G, ctx, playerID);
        if (playables.length > 0) {
            moves.push(playables[0]!);
        }
        // Toujours proposer la fin de phase en secours (BotDriver teste dans l’ordre).
        moves.push({ move: 'endShadowPhase', args: [] });
        return moves;
    }

    // --- Phase Fellowship ---
    if (phase === 'fellowship' && playerID === fp) {
        const playables = fellowshipPlayMoves(G, ctx, playerID);
        if (playables.length > 0) {
            moves.push(playables[0]!);
        }
        moves.push({ move: 'endFellowshipPhase', args: [] });
        return moves;
    }

    // --- Escarmouche ---
    if (phase === 'skirmish' && playerID === fp) {
        if (G.activeSkirmishId) {
            const active = (G.skirmishes || []).find(
                (s) => s.id === G.activeSkirmishId
            );
            // Déjà résolu : NE PAS rappeler resolve (re-blesse / re-ouvre réponses).
            // Même chemin que l’UI : cleanupPendingDeaths.
            if (active?.resolved) {
                if (!G.responseWindow?.isOpen && !G.pendingEvent) {
                    moves.push({ move: 'cleanupPendingDeaths', args: [] });
                }
                return moves;
            }
            // Fenêtre d’actions encore ouverte → pass plus haut via pendingNamedActor.
            if (!G.actionWindow?.isOpen) {
                moves.push({ move: 'resolveActiveSkirmish', args: [] });
            }
            return moves;
        }
        const next = (G.skirmishes || []).find(
            (s) => s.minionIds.length > 0 && !s.resolved
        );
        if (next) {
            moves.push({ move: 'selectSkirmish', args: [next.id] });
            return moves;
        }
        moves.push({ move: 'endSkirmishPhase', args: [] });
        return moves;
    }

    // --- Regroupement ---
    if (phase === 'regroup') {
        if (G.regroupStep === 'SHADOW_REFILL' && playerID === shadow) {
            const handLen = G.players[playerID]?.hand?.length ?? 0;
            if (handLen > 8) {
                moves.push({ move: 'discardCardFromHand', args: [0] });
            } else {
                moves.push({ move: 'confirmHandRefill', args: [] });
            }
            return moves;
        }
        if (G.regroupStep === 'FP_REFILL' && playerID === fp) {
            const handLen = G.players[playerID]?.hand?.length ?? 0;
            if (handLen > 8) {
                moves.push({ move: 'discardCardFromHand', args: [0] });
            } else {
                moves.push({ move: 'confirmHandRefill', args: [] });
            }
            return moves;
        }
        if (G.regroupStep === 'FP_DECISION' && playerID === fp) {
            const canMove =
                (G.movesThisTurn || 0) < getMoveLimit(G) &&
                !G.preventMoveAgain &&
                !G.pendingSiteMoveAbility &&
                !G.pendingSiteCharacterWounds &&
                !G.pendingDeadPileRemoval;
            if (canMove) {
                moves.push({ move: 'moveNextSite', args: [] });
            } else {
                moves.push({ move: 'endTurnChoice', args: [] });
            }
            return moves;
        }
    }

    // --- Début de phase ---
    if (
        phase.startsWith('startOf') &&
        G.startOfPhaseState?.players?.[playerID] &&
        !G.startOfPhaseState.players[playerID].isDone
    ) {
        moves.push({ move: 'confirmStartOfPhase', args: [] });
        return moves;
    }

    if (G.pendingPhaseEnd) {
        moves.push({ move: 'confirmEndPhase', args: [] });
        return moves;
    }

    return moves;
}
