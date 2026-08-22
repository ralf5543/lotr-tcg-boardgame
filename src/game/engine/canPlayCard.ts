// src/game/engine/canPlayCard.ts

import type {
    CardState,
    SiteCardState,
    GameState,
    CardType,
    CardSubtype,
} from '../types';

export interface ValidationContext {
    G: GameState;
    ctx: { phase?: string; currentPlayer?: string };
    playerID: string;
}

export interface ValidationResult {
    valid: boolean;
    reason?: string;
}

/* ==========================================================================
   1. HELPERS DE DESTINATION ET DE CIBLAGE
   ========================================================================== */

const isSupportAreaSubtype = (subtype?: CardSubtype | string): boolean => {
    if (!subtype) return false;
    const normalized = subtype.toUpperCase().replace('_', '-');
    return normalized === 'SUPPORT-AREA';
};

export const canDropInSupportArea = (
    type?: CardType,
    subtype?: CardSubtype | string
): boolean => {
    if (!type) return false;

    // 1. Alliés et Suivants
    if (type === 'ALLY' || type === 'FOLLOWER') return true;

    // 2. Possessions et Conditions : strictes sur SUPPORT-AREA
    if (type === 'POSSESSION' || type === 'CONDITION') {
        return isSupportAreaSubtype(subtype);
    }

    // 3. Artefacts
    if (type === 'ARTIFACT') {
        return !subtype || isSupportAreaSubtype(subtype);
    }

    return false;
};

export const canDropInFellowship = (type?: CardType): boolean => {
    if (!type) return false;
    return type === 'COMPANION';
};

/**
 * Vérifie si un attachement peut se fixer sur une cible donnée
 */
export const canAttachToCharacter = (
    attachmentCard?: CardState | SiteCardState | null,
    targetCard?: CardState | SiteCardState | null
): boolean => {
    if (!attachmentCard || !targetCard) return false;

    const attachment = attachmentCard as CardState;
    const target = targetCard as CardState;

    // Si la carte n'a aucun prérequis d'attachement défini dans `attachedTo`, elle ne s'attache pas
    if (
        !attachment.attachedTo ||
        !Array.isArray(attachment.attachedTo) ||
        attachment.attachedTo.length === 0
    ) {
        return false;
    }

    const targetEnTitle = (
        target.i18n?.en?.title ||
        target.title ||
        (target as any).name ||
        ''
    ).trim();

    const targetRace = target.race
        ? String(target.race).toUpperCase()
        : undefined;
    const targetCulture = target.culture
        ? String(target.culture).toUpperCase()
        : undefined;
    const targetType = target.type
        ? String(target.type).toUpperCase()
        : undefined;
    const targetKeywords = Array.isArray(target.keywords)
        ? target.keywords.map((k) => String(k).toUpperCase())
        : [];

    const checkSingleRequirement = (req: unknown): boolean => {
        const rawReq = String(req ?? '').trim();
        if (!rawReq) return false;

        const reqUpper = rawReq.toUpperCase();

        if (reqUpper === 'SITE' && targetType === 'SITE') return true;
        if (targetRace && targetRace === reqUpper) return true;
        if (targetCulture && targetCulture === reqUpper) return true;
        if (targetType && targetType === reqUpper) return true;
        if (targetKeywords.includes(reqUpper)) return true;

        if (
            targetEnTitle &&
            targetEnTitle.toLowerCase() === rawReq.toLowerCase()
        ) {
            return true;
        }

        return false;
    };

    const requirements = attachment.attachedTo as string[][];

    return requirements.some((group) => {
        if (!Array.isArray(group) || group.length === 0) return false;
        return group.every((req) => checkSingleRequirement(req));
    });
};

/* ==========================================================================
   2. RÈGLES DE VALIDATION MOTEUR
   ========================================================================== */

function checkPhaseAndKind(
    card: CardState,
    context: ValidationContext
): ValidationResult {
    const { ctx, playerID, G } = context;
    const currentPhase = ctx.phase;
    const fpPlayerId = G.fpPlayerId || '0';

    if (card.kind === 'FREE_PEOPLE') {
        if (playerID !== fpPlayerId) {
            return {
                valid: false,
                reason: 'Seul le joueur des Peuples Libres peut jouer cette carte.',
            };
        }
        if (currentPhase !== 'fellowship') {
            return {
                valid: false,
                reason: 'Les cartes Peuples Libres se jouent en phase de Communauté.',
            };
        }
    } else if (card.kind === 'SHADOW') {
        if (playerID === fpPlayerId) {
            return {
                valid: false,
                reason: "Seul le joueur de l'Ombre peut jouer cette carte.",
            };
        }
        if (currentPhase !== 'shadow') {
            return {
                valid: false,
                reason: "Les cartes de l'Ombre se jouent en phase d'Ombre.",
            };
        }
    }

    return { valid: true };
}

function checkTwilightCost(
    card: CardState,
    context: ValidationContext
): ValidationResult {
    const { G, playerID } = context;
    const fpPlayerId = G.fpPlayerId || '0';

    if (playerID !== fpPlayerId && card.kind === 'SHADOW') {
        const cost = card.twilightCost || 0;
        if (G.twilightPool < cost) {
            return {
                valid: false,
                reason: `Pool de Crépuscule insuffisant (${G.twilightPool}/${cost}).`,
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

    // 1. Recherche dans toutes les zones EN JEU
    const allInPlay: CardState[] = [];
    Object.values(G.players || {}).forEach((p) => {
        if (p.fellowshipArea) {
            p.fellowshipArea.forEach((c) => {
                if (c) {
                    allInPlay.push(c);
                    if (c.attachments) allInPlay.push(...c.attachments);
                }
            });
        }
        if (p.supportArea) {
            p.supportArea.forEach((c) => {
                if (c) {
                    allInPlay.push(c);
                    if (c.attachments) allInPlay.push(...c.attachments);
                }
            });
        }
    });

    if (G.battlefield) {
        G.battlefield.forEach((c) => {
            if (c) {
                allInPlay.push(c);
                if (c.attachments) allInPlay.push(...c.attachments);
            }
        });
    }

    const existsInPlay = allInPlay.some(
        (c) => c && c.isUnique && getCardTitle(c) === cardTitle
    );
    if (existsInPlay) {
        return {
            valid: false,
            reason: `La carte unique '${card.title || cardTitle}' est déjà en jeu.`,
        };
    }

    // 2. Recherche uniquement dans la deadPile DU JOUEUR ACTIF
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
   3. POINT D'ENTRÉE DE VALIDATION
   ========================================================================== */

export function canPlayCard(
    card: CardState,
    context: ValidationContext,
    targetId?: string,
    targetCard?: CardState | SiteCardState | null,
    options?: { ignorePhase?: boolean } // 🟢 Option pour les survol UI
): ValidationResult {
    // 1. Phase et Alignement (ignoré si survol UI)
    if (!options?.ignorePhase) {
        const phaseCheck = checkPhaseAndKind(card, context);
        if (!phaseCheck.valid) return phaseCheck;
    }

    // 2. Coût en crépuscule
    const twilightCheck = checkTwilightCost(card, context);
    if (!twilightCheck.valid) return twilightCheck;

    // 3. Unicité
    const uniquenessCheck = checkUniqueness(card, context);
    if (!uniquenessCheck.valid) return uniquenessCheck;

    // 4. Validation de la Zone ou de la Cible
    if (targetId) {
        if (targetId === 'fellowshipArea') {
            if (!canDropInFellowship(card.type)) {
                return {
                    valid: false,
                    reason: 'Seuls les Compagnons vont dans la zone Communauté.',
                };
            }
        } else if (targetId === 'supportArea') {
            if (!canDropInSupportArea(card.type, card.subtype)) {
                return {
                    valid: false,
                    reason: 'Cette carte ne peut pas être posée en zone de soutien.',
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
