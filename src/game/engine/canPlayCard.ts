// src/game/engine/canPlayCard.ts

import type {
    CardState,
    SiteCardState,
    GameState,
    CardType,
    CardSubtype,
} from '../types';

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

/**
 * Détermine si une carte exige d'être attachée à une cible (porte la clause "Bearer must be...")
 */
export const requiresAttachmentTarget = (card: CardState): boolean => {
    return Boolean(
        card.attachedTo &&
        Array.isArray(card.attachedTo) &&
        card.attachedTo.length > 0
    );
};

/**
 * Valide si une carte de type Possession/Condition/Artefact sans hôte peut aller en zone de soutien
 */
export const canDropInSupportArea = (card: CardState): boolean => {
    const { type } = card;
    if (!type) return false;

    // Alliés et Suivants vont en zone de soutien par défaut
    if (type === 'ALLY' || type === 'FOLLOWER') return true;

    // Possessions & Conditions : Se posent en soutien SI ELLES N'ONT PAS d'attachement requis
    if (type === 'POSSESSION' || type === 'CONDITION' || type === 'ARTIFACT') {
        return !requiresAttachmentTarget(card);
    }

    return false;
};

/**
 * Valide si une carte peut être posée directement dans la zone Communauté (Fellowship Area)
 */
export const canDropInFellowship = (type?: CardType): boolean => {
    return type === 'COMPANION';
};

/**
 * Vérifie si une carte d'attachement peut se fixer sur un personnage cible spécifique
 * en comparant son tableau `attachedTo` aux attributs du personnage cible.
 */
export const canAttachToCharacter = (
    attachmentCard?: CardState | SiteCardState | null,
    targetCard?: CardState | SiteCardState | null
): boolean => {
    if (!attachmentCard || !targetCard) return false;

    const attachment = attachmentCard as CardState;
    const target = targetCard as CardState;

    // Sans clause `attachedTo`, la carte ne s'attache à personne (direction supportArea)
    if (!requiresAttachmentTarget(attachment)) {
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

    // validation DNF (Disjunctive Normal Form) : AU MOINS UN groupe d'exigences doit être TOUT à fait satisfait
    return requirements.some((group) => {
        if (!Array.isArray(group) || group.length === 0) return false;
        return group.every((req) => checkSingleRequirement(req));
    });
};

/* ==========================================================================
   2. SOUS-RÈGLES DU MOTEUR (CHECKS INTERNES)
   ========================================================================== */

/**
 * Vérifie que le joueur est autorisé à jouer selon son rôle et la phase en cours
 */
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

/**
 * Vérifie que le joueur a suffisamment de Crépuscule en réserve (Shadow uniquement)
 */
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

/**
 * Extraction sécurisée du titre d'une carte pour la comparaison d'unicité
 */
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

/**
 * Vérifie l'unicité des cartes en jeu et dans la deadPile.
 * - FP : Unicité propre aux zones + deadPile du joueur actif.
 * - SHADOW : Unicité globale sur le champ de bataille et la table.
 */
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
        // 🔴 OMBRE : Unicité GLOBALE sur le champ de bataille
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
        // 🟢 PEUPLES LIBRES : Unicité PROPRE AU JOUEUR ACTIF
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

    // Check deadPile du joueur actif
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

/**
 * Point de vérité unique validant si une carte peut être jouée/déposée.
 */
export function canPlayCard(
    card: CardState,
    context: ValidationContext,
    targetId?: string,
    targetCard?: CardState | SiteCardState | null,
    options?: ValidationOptions
): ValidationResult {
    // 1. Phase et rôle des joueurs (sauf si survol UI)
    if (!options?.ignorePhase) {
        const phaseCheck = checkPhaseAndKind(card, context);
        if (!phaseCheck.valid) return phaseCheck;
    }

    // 2. Coût en crépuscule
    const twilightCheck = checkTwilightCost(card, context);
    if (!twilightCheck.valid) return twilightCheck;

    // 3. Unicité (Tableau / DeadPile)
    const uniquenessCheck = checkUniqueness(card, context);
    if (!uniquenessCheck.valid) return uniquenessCheck;

    // 4. Validation du dépôt en Zone ou sur Cible
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
            // Cible d'attachement sur un personnage
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