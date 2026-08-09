import type { CardType, CardSubtype } from '../game/types';

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

export const canAttachToCharacter = (
    type?: CardType,
    subtype?: CardSubtype | string
): boolean => {
    if (!type) return false;

    // 🛑 1. Tout ce qui a pour sous-type SUPPORT-AREA ne s'attache JAMAIS à un personnage
    if (subtype === 'SUPPORT-AREA' || subtype === 'SUPPORT_AREA') {
        return false;
    }

    // 🟢 2. Une Condition ne s'attache que si elle N'EST PAS une condition de Support Area
    if (type === 'CONDITION') {
        // Une condition sans subtype de support area est attachable (ex: plaies, buffs directs)
        return true;
    }

    // 🟢 3. Possessions / Artefacts : doivent être explicitement attachables
    if (type === 'POSSESSION') {
        return true;
    }

    if (type === 'ARTIFACT') {
        return Boolean(subtype);
    }

    return false;
};