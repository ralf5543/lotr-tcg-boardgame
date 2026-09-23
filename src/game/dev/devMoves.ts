import type {
    LotrMoveContext,
    LotrPhaseContext,
    DevPresetType,
    GameState,
} from '../types';
import { applyDevPreset } from './presets';
import { clearActionableFlags } from '../../utils/clearActionableFlags';
import { addThreats, getThreatLimit } from '../logic/threats';
import {
    placeCultureTokens,
    removeCultureTokensFromCard,
    resolveReinforceCulture,
    tokenCountOnCard,
} from '../logic/cultureTokens';
import { onStartOfFellowshipBegin } from '../logic/startOfFellowship';
import type { CardCulture } from '../types';

/** État de machine de phase : toasters, fenêtres, sous-étapes. */
function resetPhaseMachine(G: GameState): void {
    G.actionWindow = undefined;
    G.responseWindow = undefined;
    G.pendingEvent = undefined;
    G.woundQueue = undefined;
    G.skirmishes = [];
    G.activeSkirmishId = undefined;
    G.maneuverStep = undefined;
    G.startOfPhaseState = undefined;
    G.musterState = undefined;
    G.assignmentStep = undefined;
    G.archeryState = undefined;
    G.archeryAssignStep = undefined;
    G.archeryWoundsToAssign = undefined;
    G.threatWoundsToAssign = undefined;
    G.archeryAfterResponses = undefined;
    G.pendingActionYieldPlayerId = undefined;
    G.pendingPhaseEnd = undefined;
    G.pendingPhaseAfterResponse = undefined;
    G.nextPhase = undefined;
    G.isFierceAssignment = false;
    G.pendingFierceAssignment = false;
    G.regroupStep = undefined;
    G.awaitingSiteSelection = false;
    G.sanctuaryHeal = undefined;
    G.pendingPlay = undefined;
    G.pendingWhenPlayed = undefined;
    G.pendingDeathQueue = undefined;
    clearActionableFlags(G);
}

export const devMoves = {
    devSetTwilight: ({ G }: LotrMoveContext, amount: number) => {
        G.twilightPool = Math.max(0, amount);
    },

    devSetBurdens: ({ G }: LotrMoveContext, deltaOrAmount: number) => {
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];
        if (!fpPlayer) return;

        if (Math.abs(deltaOrAmount) === 1) {
            fpPlayer.burdens = Math.max(0, fpPlayer.burdens + deltaOrAmount);
        } else {
            fpPlayer.burdens = Math.max(0, deltaOrAmount);
        }
        G.statusMessage = `[DEV] Burdens ajustés à ${fpPlayer.burdens}.`;
    },

    devSetThreats: ({ G }: LotrMoveContext, delta: number) => {
        const added = addThreats(G, delta);
        const fpId = G.fpPlayerId || '0';
        const threats = G.players[fpId]?.threats ?? 0;
        const limit = getThreatLimit(G);

        if (delta > 0 && added === 0) {
            G.statusMessage = `[DEV] Menaces déjà au plafond (${threats}/${limit} compagnons).`;
            return;
        }

        G.statusMessage = `[DEV] Menaces ajustées à ${threats}/${limit}.`;
    },

    /** ±1 jeton sur la 1ʳᵉ condition zone de soutien FP qui en a (ou la 1ʳᵉ). */
    devAdjustCultureTokens: ({ G }: LotrMoveContext, delta: number) => {
        const fpId = G.fpPlayerId || '0';
        const fpPlayer = G.players[fpId];
        if (!fpPlayer) return;
        const support = fpPlayer.supportArea || [];
        const withTokens = support.find(
            (card) => tokenCountOnCard(card, 'ANY') > 0
        );
        const card = withTokens || support[0];
        if (!card) {
            G.statusMessage =
                '[DEV] Aucune carte en zone de soutien FP pour les jetons.';
            return;
        }
        const culture =
            resolveReinforceCulture(card, 'ANY') ||
            (card.culture as CardCulture);
        if (delta > 0) {
            placeCultureTokens(card, culture, delta);
        } else {
            removeCultureTokensFromCard(card, culture, -delta);
        }
        G.statusMessage = `[DEV] ${card.title || card.id} : ${tokenCountOnCard(card, 'ANY')} jeton(s) ${culture}.`;
    },

    devSetArchery: ({ G }: LotrMoveContext, amount: number) => {
        const newAmount = Math.max(0, amount);

        if (G.archeryState) {
            G.archeryState.fpTotal = newAmount;
            G.archeryState.fpRemainingWounds = newAmount;
            G.archeryState.step =
                newAmount > 0 ? 'FP_ASSIGN' : G.archeryState.step;
        }
        G.archeryWoundsToAssign = newAmount;

        G.statusMessage = `[DEV] Archerie FP forcée à : ${newAmount}`;
    },

    /** Place la compagnie sur l’emplacement 0–8 du chemin (sites déjà posés ou non). */
    devSetCurrentSite: ({ G }: LotrMoveContext, siteIndex: number) => {
        const index = Math.max(0, Math.min(8, Math.floor(siteIndex)));
        Object.values(G.players).forEach((player) => {
            if (player) player.currentSiteIndex = index;
        });
        G.currentSiteIndex = index;

        const site = G.path?.[index];
        const label =
            site?.name ||
            (site as { title?: string } | null)?.title ||
            site?.id;
        G.statusMessage = site
            ? `[DEV] Téléport site ${index + 1} : ${label} (pas de crépuscule ni effets move)`
            : `[DEV] Téléport emplacement ${index + 1} (vide)`;
    },

    devSetPhase: ({ G, events }: LotrPhaseContext, targetPhase: string) => {
        resetPhaseMachine(G);

        if (targetPhase === 'regroup') {
            G.regroupStep = 'SHADOW_REFILL';
            if (!G.movesThisTurn) {
                G.movesThisTurn = 1;
            }
        }

        G.statusMessage = `[DEV] Phase forcée : ${targetPhase}`;
        events?.setPhase?.(targetPhase);

        // setPhase ne rejoue pas onBegin si on est déjà sur cette phase.
        if (targetPhase === 'startOfFellowship' && !G.sanctuaryHeal) {
            onStartOfFellowshipBegin(G, events);
        }
    },

    devForceEndPhase: ({ events }: LotrMoveContext) => {
        if (events) {
            events.setActivePlayers?.({ value: { '0': 'play', '1': 'play' } });
            events.endPhase?.();
        }
    },

    devLoadPreset: (
        { G, events }: LotrPhaseContext,
        presetType: DevPresetType
    ) => {
        resetPhaseMachine(G);
        applyDevPreset(G, presetType);
        events?.setPhase?.('startOfFellowship');
        if (!G.sanctuaryHeal) {
            onStartOfFellowshipBegin(G, events);
        }
    },
};