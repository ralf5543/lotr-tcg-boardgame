import { audioService } from '../../services/audioService';

/**
 * Son à l’impact d’une flèche de ciblage (attaque : blessure / exhaust / exert).
 * Défaut = SMASH. Overrides = ARROW_IMPACT (archerie + quelques cartes).
 */
const ARROW_IMPACT_CARD_IDS = new Set([
    '4P364', // Aragorn, Pieds-Ailés
    '3U10', // Calaglin
    '1U105', // Ennemis du Mordor
]);

export function playTargetingArrowHitSound(options: {
    sourceId?: string;
    abilityPhases?: string[];
    gamePhase?: string;
}): void {
    const phases = options.abilityPhases || [];
    const isArchery =
        options.gamePhase === 'archery' ||
        phases.some((p) => p.toUpperCase() === 'ARCHERY');

    if (
        isArchery ||
        (options.sourceId && ARROW_IMPACT_CARD_IDS.has(options.sourceId))
    ) {
        audioService.play('ARROW_IMPACT');
        return;
    }

    audioService.play('SMASH');
}
