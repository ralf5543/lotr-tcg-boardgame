import type { DevPresetType, GameState } from '../types';

/**
 * Applique le preset DEV de playtest (vague en cours).
 * Aucun preset actif — decks Fumeurs / Gondor-Ourouks clos après Light the Beacons.
 */
export const applyDevPreset = (
    _G: GameState,
    _presetType: DevPresetType
): void => {
    // Pas de preset DEV en cours.
};
