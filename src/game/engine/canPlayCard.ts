// src/game/engine/canPlayCard.ts

import type { CardState, SiteCardState, GameState, CardType } from '../types';
import { checkPhases } from './validations/checkPhases';
import { checkToPlayConditions } from './validations/checkToPlayConditions';
import { cardMatchesTarget } from './validations/matchers';

/* ==========================================================================
   TYPES & INTERFACES
   ========================================================================== */

export interface ValidationContext {
    G: GameState;
    ctx: { phase?: string; currentPlayer?: string };
    playerID: string;
}

export interface ValidationResult {
    valid: boolean;
    reason?: string;
}

export interface ValidationOptions {
    ignorePhase?: boolean;
}

/* ==========================================================================
   1. HELPERS D'ATTACHEMENT ET DE DESTINATION
   ========================================================================== */

export const requiresAttachmentTarget = (card: CardState): boolean => {
    // 1. Si c'est un Suivant transféré
    if (card.attachedViaAid) {
        return true;
    }

    // 2. Si attachedTo est renseigné (string OU tableau de strings)
    if (card.attachedTo) {
        if (Array.isArray(card.attachedTo)) {
            return card.attachedTo.length > 0;
        }
        return Boolean(card.attachedTo);
    }

    return false;
};

export const canDropInSupportArea = (card: CardState): boolean => {
    const { type } = card;
    if (!type) return false;

    if (type === 'ALLY' || type === 'FOLLOWER') return true;

    if (type === 'POSSESSION' || type === 'CONDITION' || type === 'ARTIFACT') {
        return !requiresAttachmentTarget(card);
    }

    return false;
};

export const canDropInFellowship = (type?: CardType): boolean => {
    return type === 'COMPANION';
};

export const canAttachToCharacter = (
    attachmentCard?: CardState | SiteCardState | null,
    targetCard?: CardState | SiteCardState | null
): boolean => {
    if (!attachmentCard || !targetCard) return false;

    const attachment = attachmentCard as CardState;
    if (!requiresAttachmentTarget(attachment)) return false;

    // 1. Vérification DNF des cibles autorisées
    const matchesTarget = cardMatchesTarget(
        targetCard,
        attachment.attachedTo as string[][]
    );
    if (!matchesTarget) return false;

    // 2. Vérification de la limite de subtype (t minuscule)
    const target = targetCard as CardState;
    const newSubtype =
        (attachment as any).subtype ||
        (attachment as any).subType ||
        (attachment as any).itemClass;

    if (newSubtype && target.attachments && target.attachments.length > 0) {
        const hasSameSubtype = target.attachments.some((existing) => {
            const existingSubtype =
                (existing as any).subtype ||
                (existing as any).subType ||
                (existing as any).itemClass;
            return existingSubtype === newSubtype;
        });

        if (hasSameSubtype) {
            return false;
        }
    }

    return true;
};

/* ==========================================================================
   2. CHECKS INTERNES
   ========================================================================== */

function checkTwilightCost(
    card: CardState,
    context: ValidationContext
): ValidationResult {
    if (!context || !context.G) {
        return { valid: false, reason: 'État du jeu (G) indisponible.' };
    }

    const { G, playerID } = context;
    const fpPlayerId = G.fpPlayerId || '0';

    if (playerID !== fpPlayerId && card.kind === 'SHADOW') {
        const cost = card.twilightCost || 0;
        if ((G.twilightPool || 0) < cost) {
            return {
                valid: false,
                reason: `Pool de Crépuscule insuffisant (${G.twilightPool || 0}/${cost}).`,
            };
        }
    }

    return { valid: true };
}

const getCardTitle = (c?: CardState | SiteCardState | null): string => {
    if (!c) return '';
    const card = c as CardState;
    return (
        card.title ||
        card.i18n?.fr?.title ||
        card.i18n?.en?.title ||
        (card as any).name ||
        ''
    )
        .trim()
        .toLowerCase();
};

function checkUniqueness(
    card: CardState,
    context: ValidationContext
): ValidationResult {
    if (!card.isUnique) return { valid: true };

    const { G, playerID } = context;
    const cardTitle = getCardTitle(card);
    if (!cardTitle) return { valid: true };

    const isShadow = card.kind === 'SHADOW';

    if (isShadow) {
        const allShadowInPlay: CardState[] = [];
        if (G.battlefield) {
            G.battlefield.forEach((c) => {
                if (c) {
                    allShadowInPlay.push(c);
                    if (c.attachments) allShadowInPlay.push(...c.attachments);
                }
            });
        }

        Object.values(G.players || {}).forEach((p) => {
            if (p.supportArea) {
                p.supportArea.forEach((c) => {
                    if (c && c.kind === 'SHADOW') {
                        allShadowInPlay.push(c);
                        if (c.attachments)
                            allShadowInPlay.push(...c.attachments);
                    }
                });
            }
        });

        const existsInPlay = allShadowInPlay.some(
            (c) => c && c.isUnique && getCardTitle(c) === cardTitle
        );
        if (existsInPlay) {
            return {
                valid: false,
                reason: `La carte d'Ombre unique '${card.title || cardTitle}' est déjà sur le champ de bataille.`,
            };
        }
    } else {
        if (playerID && G.players?.[playerID]) {
            const player = G.players[playerID];
            const activePlayerInPlay: CardState[] = [];

            if (player.fellowshipArea) {
                player.fellowshipArea.forEach((c) => {
                    if (c) {
                        activePlayerInPlay.push(c);
                        if (c.attachments)
                            activePlayerInPlay.push(...c.attachments);
                    }
                });
            }
            if (player.supportArea) {
                player.supportArea.forEach((c) => {
                    if (c) {
                        activePlayerInPlay.push(c);
                        if (c.attachments)
                            activePlayerInPlay.push(...c.attachments);
                    }
                });
            }

            const existsInPlay = activePlayerInPlay.some(
                (c) => c && c.isUnique && getCardTitle(c) === cardTitle
            );
            if (existsInPlay) {
                return {
                    valid: false,
                    reason: `Vous avez déjà la carte unique '${card.title || cardTitle}' en jeu.`,
                };
            }
        }
    }

    if (playerID && G.players?.[playerID]?.deadPile) {
        const activePlayerDeadPile = G.players[playerID].deadPile;
        const existsInDeadPile = activePlayerDeadPile.some(
            (c) => c && getCardTitle(c) === cardTitle
        );

        if (existsInDeadPile) {
            return {
                valid: false,
                reason: `La carte unique '${card.title || cardTitle}' est dans votre pile des morts.`,
            };
        }
    }

    return { valid: true };
}

/* ==========================================================================
   3. POINT D'ENTRÉE PRINCIPAL (canPlayCard)
   ========================================================================== */

export function canPlayCard(
    card: CardState,
    context: ValidationContext,
    targetId?: string,
    targetCard?: CardState | SiteCardState | null,
    options?: ValidationOptions
): ValidationResult {
    if (!card || !context || !context.G) {
        return { valid: false, reason: 'Données de validation manquantes.' };
    }
    // 1. Phase et rôle des joueurs
    if (!options?.ignorePhase) {
        const phaseCheck = checkPhases(card, context);
        if (!phaseCheck.valid) return phaseCheck;
    }

    // 2. Coût en crépuscule
    const twilightCheck = checkTwilightCost(card, context);
    if (!twilightCheck.valid) return twilightCheck;

    // 3. Unicité
    const uniquenessCheck = checkUniqueness(card, context);
    if (!uniquenessCheck.valid) return uniquenessCheck;

    // 4. Conditions prérequis "To Play" (spot, exert, burdens, discard...)
    const toPlayCheck = checkToPlayConditions(card, context);
    if (!toPlayCheck.valid) return toPlayCheck;

    // 5. Validation du dépôt en Zone ou sur Cible
    if (targetId) {
        if (targetId === 'fellowshipArea') {
            if (!canDropInFellowship(card.type)) {
                return {
                    valid: false,
                    reason: 'Seuls les Compagnons vont dans la zone Communauté.',
                };
            }
        } else if (targetId === 'supportArea') {
            if (!canDropInSupportArea(card)) {
                return {
                    valid: false,
                    reason: 'Cette carte doit être attachée à un personnage et ne peut pas aller en zone de soutien.',
                };
            }
        } else if (targetId === 'battlefield') {
            if (card.kind !== 'SHADOW' || card.type !== 'MINION') {
                return {
                    valid: false,
                    reason: "Seuls les Séides de l'Ombre vont sur le champ de bataille.",
                };
            }
        } else {
            if (!targetCard) {
                return {
                    valid: false,
                    reason: "Cible d'attachement introuvable.",
                };
            }
            if (!canAttachToCharacter(card, targetCard)) {
                return {
                    valid: false,
                    reason: "Cible d'attachement invalide pour cette carte.",
                };
            }
        }
    }

    return { valid: true };
}
