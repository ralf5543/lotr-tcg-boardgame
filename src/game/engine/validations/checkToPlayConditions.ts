// src/game/engine/validations/checkToPlayConditions.ts

import type { CardState, GameState, PlayerState } from '../../types';
import { cardMatchesTarget } from './matchers';

export interface ValidationContext {
    G: GameState;
    ctx: { phase?: string; currentPlayer?: string };
    playerID: string;
}

/**
 * Cartes valides pour 'spot' selon l'alignement de la carte jouée
 */
function getSpottableCardsInPlay(G: GameState, playerID: string, card: CardState): CardState[] {
    const cards: CardState[] = [];
    
    // 1. Si la carte jouée est FREE_PEOPLE : uniquement les cartes du joueur actif
    if (card.kind === 'FREE_PEOPLE') {
        const player = G.players?.[playerID];
        if (!player) return cards;

        const collect = (list?: CardState[]) => {
            if (!list) return;
            list.forEach((c) => {
                if (c) {
                    cards.push(c);
                    if (c.attachments) cards.push(...c.attachments);
                }
            });
        };

        collect(player.fellowshipArea);
        collect(player.supportArea);
        return cards;
    } else {
        // 2. Pour l'Ombre (SHADOW) : on peut spotté nos Minions ET la communauté active adverse
        Object.values(G.players || {}).forEach((player: PlayerState) => {
            const collect = (list?: CardState[]) => {
                if (!list) return;
                list.forEach((c) => {
                    if (c) {
                        cards.push(c);
                        if (c.attachments) cards.push(...c.attachments);
                    }
                });
            };
            collect(player.fellowshipArea);
            collect(player.supportArea);
        });
        
        if (G.battlefield) {
            G.battlefield.forEach((c) => {
                if (c) {
                    cards.push(c);
                    if (c.attachments) cards.push(...c.attachments);
                }
            });
        }
    }

    return cards;
}

/**
 * Valide une unique option de toPlay (ex: { spot: [...], exert: [...] })
 */
function validateToPlayOption(
    option: Record<string, any>,
    card: CardState,
    context: ValidationContext
): { valid: boolean; reason?: string } {
    const { G, playerID } = context;
    const cardsInPlay = getSpottableCardsInPlay(G, playerID, card);
    const player = G.players?.[playerID];

    // 1. SPOT (Désigner des cartes en jeu)
    if (option.spot && Array.isArray(option.spot)) {
        for (const req of option.spot) {
            const countRequired = req.count || 1;
            const targetGroups = req.target;

            const matchingCards = cardsInPlay.filter((c) =>
                cardMatchesTarget(c, targetGroups)
            );

            if (matchingCards.length < countRequired) {
                return {
                    valid: false,
                    reason: `Exigence 'Spot' non satisfaite (${matchingCards.length}/${countRequired}).`,
                };
            }
        }
    }

    // 2. EXERT (Affaiblir des cartes qui ont assez de Vitalité)
    if (option.exert && Array.isArray(option.exert)) {
        for (const req of option.exert) {
            const countRequired = req.count || 1;
            const targetGroups = req.target;

            const eligibleCards = cardsInPlay.filter((c) => {
                if (!cardMatchesTarget(c, targetGroups)) return false;
                const wounds = (c as any).wounds || c.tokens?.wound || 0;
                const currentVitality = (c.vitality || 0) - wounds;
                return currentVitality > 1; // Doit survivre à l'effort
            });

            if (eligibleCards.length < countRequired) {
                return {
                    valid: false,
                    reason: `Pas assez de cartes à affaiblir (exert).`,
                };
            }
        }
    }

    // 3. DISCARD FROM PLAY (Défausser du terrain)
    if (option.discardFromPlay && Array.isArray(option.discardFromPlay)) {
        for (const req of option.discardFromPlay) {
            const countRequired = req.count || 1;
            const targetGroups = req.target;

            const matchingCards = cardsInPlay.filter((c) =>
                cardMatchesTarget(c, targetGroups)
            );

            if (matchingCards.length < countRequired) {
                return {
                    valid: false,
                    reason: `Pas assez de cartes sur le terrain à défausser.`,
                };
            }
        }
    }

    // 4. DISCARD FROM HAND (Défausser X cartes de sa main)
    if (typeof option.discardFromHand === 'number') {
        const handCount = player?.hand?.length || 0;
        if (handCount < option.discardFromHand + 1) { 
            return {
                valid: false,
                reason: `Main insuffisante pour défausser ${option.discardFromHand} carte(s).`,
            };
        }
    }

    // 5. BURDENS (Fardeaux sur PlayerState)
    const burdens = player?.burdens || 0;
    if (typeof option.spotBurdens === 'number' && burdens < option.spotBurdens) {
        return { valid: false, reason: `Fardeaux insuffisants (${burdens}/${option.spotBurdens}).` };
    }
    if (typeof option.removeBurdens === 'number' && burdens < option.removeBurdens) {
        return { valid: false, reason: `Pas assez de fardeaux à retirer (${burdens}/${option.removeBurdens}).` };
    }

    // 6. THREATS (Menaces sur PlayerState)
    const threats = (player as any)?.threats || 0;
    if (typeof option.spotThreats === 'number' && threats < option.spotThreats) {
        return { valid: false, reason: `Menaces insuffisantes (${threats}/${option.spotThreats}).` };
    }
    if (typeof option.removeThreats === 'number' && threats < option.removeThreats) {
        return { valid: false, reason: `Pas assez de menaces à retirer (${threats}/${option.removeThreats}).` };
    }

    return { valid: true };
}

/**
 * Valide si la carte peut être jouée selon sa propriété `toPlay`.
 */
export function checkToPlayConditions(
    card: CardState,
    context: ValidationContext
): { valid: boolean; reason?: string } {
    const toPlay = (card as any).toPlay;

    if (!toPlay || !Array.isArray(toPlay) || toPlay.length === 0) {
        return { valid: true };
    }

    let lastReason = 'Conditions pour jouer la carte non remplies.';

    for (const option of toPlay) {
        const result = validateToPlayOption(option, card, context);
        if (result.valid) {
            return { valid: true };
        }
        if (result.reason) lastReason = result.reason;
    }

    return { valid: false, reason: lastReason };
}

/* ==========================================================================
   HELPERS UI (Visuels pour les effets "Spot")
   ========================================================================== */

/**
 * Indique si une carte possède au moins une condition 'spot' dans son toPlay
 */
export function hasSpotCondition(card: CardState): boolean {
    const toPlay = (card as any).toPlay;
    if (!toPlay || !Array.isArray(toPlay)) return false;

    return toPlay.some((option: any) => Boolean(option.spot && option.spot.length > 0));
}

/**
 * Évalue si TOUTES les conditions 'spot' de la carte sont actuellement remplies
 */
export function isSpotConditionMet(card: CardState, context: ValidationContext): boolean {
    const toPlay = (card as any).toPlay;
    if (!toPlay || !Array.isArray(toPlay)) return false;

    const { G, playerID } = context;
    const cardsInPlay = getSpottableCardsInPlay(G, playerID, card);

    // Vérifie chaque option qui contient du spot
    for (const option of toPlay) {
        if (option.spot && Array.isArray(option.spot)) {
            for (const req of option.spot) {
                const countRequired = req.count || 1;
                const targetGroups = req.target;

                const matchingCount = cardsInPlay.filter((c) =>
                    cardMatchesTarget(c, targetGroups)
                ).length;

                if (matchingCount < countRequired) {
                    return false;
                }
            }
        }
    }

    return true;
}