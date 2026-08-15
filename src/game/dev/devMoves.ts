import type { LotrMoveContext, LotrPhaseContext, DevPresetType } from '../types';
import { applyDevPreset } from './presets';

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

    devSetPhase: ({ G, events }: LotrPhaseContext, targetPhase: string) => {
        G.actionWindow = undefined;
        G.skirmishes = [];
        G.activeSkirmishId = undefined;

        if (targetPhase === 'regroup') {
            G.regroupStep = 'SHADOW_REFILL';
            if (!G.movesThisTurn) {
                G.movesThisTurn = 1;
            }
        } else {
            G.regroupStep = undefined;
        }

        events?.setPhase?.(targetPhase);
    },

    devForceEndPhase: ({ events }: LotrMoveContext) => {
        if (events) {
            events.setActivePlayers?.({ value: { '0': 'play', '1': 'play' } });
            events.endPhase?.();
        }
    },

    devLoadPreset: ({ G }: LotrMoveContext, presetType: DevPresetType) => {
        applyDevPreset(G, presetType);
    },
};