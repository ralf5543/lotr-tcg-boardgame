// src/game/engine/canPlayCard.ts

import type { CardState, GameState } from '../types';

export interface ValidationContext {
    G: GameState;
    ctx: { phase?: string; currentPlayer?: string };
    playerID: string;
}

export interface ValidationResult {
    valid: boolean;
    reason?: string;
}

/**
 * Extrait le titre anglais de référence (nettoyé) pour la règle d'unicité
 */
export function getCardTitle(card: CardState): string {
    if (!card) return '';
    // On essaie toutes les clés possibles pour être sûr de choper le nom (i18n, title, name)
    const rawTitle =
        card.i18n?.en?.title ||
        card.title ||
        card.name ||
        (card as any).i18nTitle ||
        '';
    return String(rawTitle).trim().toLowerCase();
}

/**
 * Récupère toutes les cartes actuellement en jeu appartenant à UN joueur spécifique
 */
export function getPlayerCardsInPlay(G: GameState, playerID: string): CardState[] {
    const cards: CardState[] = [];
    const player = G.players?.[playerID];

    if (!player) return cards;

    // 1. Zones propres au joueur (Communauté, Soutien)
    if (Array.isArray(player.fellowshipArea)) cards.push(...player.fellowshipArea);
    if (Array.isArray(player.supportArea)) cards.push(...player.supportArea);

    // 2. Si c'est le joueur Ombre, on regarde ses Minions sur le Battlefield
    const fpId = G.fpPlayerId || '0';
    const isShadow = playerID !== fpId;

    if (isShadow && Array.isArray(G.battlefield)) {
        // Enregistre uniquement les Minions/cartes Ombre du champ de bataille
        cards.push(...G.battlefield);
    }

    // 3. Extraction récursive des attachements
    const allWithAttachments: CardState[] = [];
    const collect = (c: CardState) => {
        if (!c) return;
        allWithAttachments.push(c);
        if (Array.isArray(c.attachments)) {
            c.attachments.forEach(collect);
        }
    };

    cards.forEach(collect);
    return allWithAttachments;
}

/**
 * 1. Validation de la Phase et de l'Alignement (FP / Ombre)
 */
export function checkPhaseAndKind(card: CardState, { G, ctx, playerID }: ValidationContext): ValidationResult {
    const fpId = G.fpPlayerId || '0';
    const isFP = playerID === fpId;
    const currentPhase = ctx.phase;

    if (isFP) {
        if (currentPhase !== 'fellowship') {
            return { valid: false, reason: `Joueur FP ne peut jouer qu'en phase Fellowship (actuelle: ${currentPhase})` };
        }
        if (card.kind !== 'FREE_PEOPLE') {
            return { valid: false, reason: `Carte Ombre jouée par le joueur FP` };
        }
    } else {
        if (currentPhase !== 'shadow') {
            return { valid: false, reason: `Joueur Ombre ne peut jouer qu'en phase Shadow (actuelle: ${currentPhase})` };
        }
        if (card.kind !== 'SHADOW') {
            return { valid: false, reason: `Carte FP jouée par le joueur Ombre` };
        }
    }

    return { valid: true };
}

/**
 * 2. Validation de la Réserve de Crépuscule (Twilight)
 */
export function checkTwilightCost(card: CardState, { G, playerID }: ValidationContext): ValidationResult {
    const fpId = G.fpPlayerId || '0';
    const isFP = playerID === fpId;
    const cost = Number(card.twilightCost) || 0;

    // Seul le joueur Ombre doit AVOIR assez de Twilight dans la réserve pour payer
    if (!isFP && G.twilightPool < cost) {
        return { valid: false, reason: `Crépuscule insuffisant (${G.twilightPool} < ${cost})` };
    }

    return { valid: true };
}

/**
 * Validation de l'Unicité (Jeu + Dead Pile)
 */
export function checkUniqueness(card: CardState, { G, playerID }: ValidationContext): ValidationResult {
    if (!card.isUnique) return { valid: true };

    const targetTitle = getCardTitle(card);
    if (!targetTitle) return { valid: true };

    // A. Cartes en jeu du joueur actif
    const playerCards = getPlayerCardsInPlay(G, playerID);
    const duplicateInPlay = playerCards.find((c) => getCardTitle(c) === targetTitle);

    if (duplicateInPlay) {
        return { 
            valid: false, 
            reason: `Vous avez déjà une version de '${card.i18n?.en?.title || card.title}' en jeu.` 
        };
    }

    // B. Recherche dans la Dead Pile
    const activeId = String(playerID ?? '0');
    const fpId = String(G.fpPlayerId ?? '0');

    if (activeId === fpId) {
        const fpPlayer = G.players?.[activeId];
        const deadPile = fpPlayer?.deadPile || [];

        const deadDuplicate = deadPile.find((c) => getCardTitle(c) === targetTitle);

        if (deadDuplicate) {
            console.warn(`⛔ [DeadPile Check] Rejet : '${targetTitle}' est dans la Dead Pile !`);
            return { 
                valid: false, 
                reason: `'${card.i18n?.en?.title || card.title}' est dans votre Dead Pile.` 
            };
        }
    }

    return { valid: true };
}
/**
 * POINT D'ENTRÉE DU MOTEUR
 */
export function canPlayCard(card: CardState, context: ValidationContext): ValidationResult {
    const phaseCheck = checkPhaseAndKind(card, context);
    if (!phaseCheck.valid) return phaseCheck;

    const twilightCheck = checkTwilightCost(card, context);
    if (!twilightCheck.valid) return twilightCheck;

    const uniquenessCheck = checkUniqueness(card, context);
    if (!uniquenessCheck.valid) return uniquenessCheck;

    return { valid: true };
}