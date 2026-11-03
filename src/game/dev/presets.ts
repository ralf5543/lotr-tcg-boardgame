import type { DevPresetType, GameState } from '../types';

/**
 * Applique le preset DEV de playtest (vague en cours).
 * Aucun preset actif — fin de partie (gagner / perdre) validée.
 */
export const applyDevPreset = (
    _G: GameState,
    _presetType: DevPresetType
): void => {
    // Pas de preset DEV en cours.
};
