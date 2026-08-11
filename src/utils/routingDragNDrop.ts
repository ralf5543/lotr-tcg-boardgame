import type {
    CardType,
    CardSubtype,
    CardState,
    SiteCardState,
} from '../game/types';

// Helper interne pour identifier si un sous-type désigne la Zone de Soutien
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

    // 1. Alliés et Suivants vont toujours en zone de soutien
    if (type === 'ALLY' || type === 'FOLLOWER') {
        return true;
    }

    // 2. Possessions et Conditions : strictes sur SUPPORT-AREA
    if (type === 'POSSESSION' || type === 'CONDITION') {
        return isSupportAreaSubtype(subtype);
    }

    // 3. Artefacts : Support Area si explicitement 'SUPPORT-AREA' OU si pas de sous-type spécifié
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
 * Vérifie si une carte (possession, artefact, condition, etc.)
 * peut être attachée à une carte cible.
 */
export const canAttachToCharacter = (
    attachmentCard?: CardState | SiteCardState | null,
    targetCard?: CardState | SiteCardState | null
): boolean => {
    if (!attachmentCard || !targetCard) return false;

    const attachment = attachmentCard as CardState;
    const target = targetCard as CardState;

    if (!attachment.attachedTo || !Array.isArray(attachment.attachedTo) || attachment.attachedTo.length === 0) {
        return false;
    }

    // Récupération du titre VO
    const targetEnTitle = (
        target.i18n?.en?.title || 
        target.title || 
        (target as any).name || 
        ''
    ).trim();

    const targetRace = target.race ? String(target.race).toUpperCase() : undefined;
    const targetCulture = target.culture ? String(target.culture).toUpperCase() : undefined;
    const targetType = target.type ? String(target.type).toUpperCase() : undefined;
    const targetKeywords = Array.isArray(target.keywords)
        ? target.keywords.map((k) => String(k).toUpperCase())
        : [];

    const checkSingleRequirement = (req: unknown): boolean => {
        const rawReq = String(req ?? '').trim();
        if (!rawReq) return false;

        const reqUpper = rawReq.toUpperCase();

        // 1. Validation Majuscules (SITE, Race, Culture, Type, Keyword)
        if (reqUpper === 'SITE' && targetType === 'SITE') return true;
        if (targetRace && targetRace === reqUpper) return true;
        if (targetCulture && targetCulture === reqUpper) return true;
        if (targetType && targetType === reqUpper) return true;
        if (targetKeywords.includes(reqUpper)) return true;

        // 2. Validation Nom Propre exact contre {card.i18n.en.title}
        if (targetEnTitle && targetEnTitle.toLowerCase() === rawReq.toLowerCase()) {
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
