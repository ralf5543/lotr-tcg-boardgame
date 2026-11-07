import type { DevPresetType, GameState } from '../types';

/**
 * Presets DEV de la vague hobbits / Nazgûl : retirés (deck validé).
 * Réintroduire un case ici dès qu’une nouvelle vague a besoin d’un terrain.
 */
export const applyDevPreset = (
    G: GameState,
    presetType: DevPresetType
): void => {
    G.statusMessage = `[DEV] Aucun preset actif (« ${presetType} »).`;
};
