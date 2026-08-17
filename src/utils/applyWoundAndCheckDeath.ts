import type { GameState, CardState } from '../game/types';
import { getEffectiveVitality } from './cardStats';
import { audioService } from '../services/audioService';

/**
 * Inflige N blessures dans G, enregistre les identifiants pour l'animation visuelle
 * et marque la carte si le coup est fatal.
 */
export const applyWoundAndCheckDeath = (
    G: GameState,
    card: CardState,
    woundsCount = 1
): boolean => {
    if (!card) return false;

    // delay to give time to the impact sound
    if (card.race === 'ORC') {
        audioService.play('WOUND_ORC', { delay: 0.3 });
    } else if (card.race === 'URUK-HAI') {
        audioService.play('WOUND_ORC', { delay: 0.3, pitch: 0.75 });
    } else if (card.race === 'NAZGUL' || card.race === 'WRAITH') {
        audioService.play('WOUND_WRAITH', { delay: 0.3 });
    } else if (
        card.race === 'TROLL' ||
        card.race === 'HALF-TROLL' ||
        card.race === 'CREATURE'
    ) {
        audioService.play('WOUND_TROLL', { delay: 0.3 });
    } else if (card.race === 'BALROG' || card.race === 'MAIA') {
        audioService.play('WOUND_TROLL', { delay: 0.3 });
    } else if (card.race === 'SPIDER') {
        audioService.play('WOUND_SPIDER', { delay: 0.3 });
    } else if (card.race === 'ELF') {
        if (card.isFemale) {
            audioService.play('WOUND_HUMAN_FEMALE', { delay: 0.3 });
        } else {
            audioService.play('WOUND_HUMAN_MALE', { delay: 0.3, pitch: 1.1 });
        }
    } else if (card.race === 'DWARF') {
        audioService.play('WOUND_HUMAN_MALE', { delay: 0.3, pitch: 0.8 });
    } else if (card.race === 'HOBBIT') {
        if (card.isFemale) {
            audioService.play('WOUND_HUMAN_FEMALE', { delay: 0.3 });
        } else {
            audioService.play('WOUND_HOBBIT', { delay: 0.3 });
        }
    } else if (card.race === 'WIZARD') {
        audioService.play('WOUND_WIZARD', { delay: 0.3 });
    } else if (card.culture === 'GOLLUM') {
        audioService.play('WOUND_GOLLUM', { delay: 0.3 });
    } else {
        if (card.isFemale) {
            audioService.play('WOUND_HUMAN_FEMALE', { delay: 0.3 });
        } else {
            audioService.play('WOUND_HUMAN_MALE', { delay: 0.3 });
        }
    }

    // 1. Infliger les blessures sur la carte
    card.wounds = (card.wounds || 0) + woundsCount;

    const cardId = card.instanceId || card.id;

    // 2. Marquer l'ID pour l'animation d'impact dans React
    if (!G.lastWoundedCardIds) G.lastWoundedCardIds = [];
    if (cardId && !G.lastWoundedCardIds.includes(cardId)) {
        G.lastWoundedCardIds.push(cardId);
    }

    // 3. Calculer la vitalité
    const effectiveVitality = getEffectiveVitality(card);

    // LOG DE DÉBOGAGE

    // Si getEffectiveVitality renvoie la vitalité RESTANTE :
    const isDead = effectiveVitality <= 0;

    // 4. Si la carte meurt, marquer le flag et alimenter pendingDeadCardIds
    if (isDead) {
        card.isDead = true;
        if (!G.pendingDeadCardIds) G.pendingDeadCardIds = [];
        if (cardId && !G.pendingDeadCardIds.includes(cardId)) {
            G.pendingDeadCardIds.push(cardId);
        }
    }

    return isDead;
};
