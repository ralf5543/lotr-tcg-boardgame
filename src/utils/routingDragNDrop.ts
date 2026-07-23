import type { CardSubtype } from '../game/types';

export const canDropInSupportArea = (subType?: CardSubtype): boolean => {
    if (!subType) return false;
    return (
        subType === 'ALLY' ||
        subType === 'POSSESSION_SUPPORT' ||
        subType === 'ARTIFACT_SUPPORT' ||
        subType === 'CONDITION_SUPPORT'
    );
};

export const canDropInFellowship = (subType?: CardSubtype): boolean => {
    if (!subType) return false;
    return subType === 'COMPANION';
};

export const canAttachToCharacter = (subType?: CardSubtype): boolean => {
    if (!subType) return false;
    return (
        subType === 'POSSESSION_CHARACTER' ||
        subType === 'ARTIFACT_CHARACTER' ||
        subType === 'CONDITION_CHARACTER'
    );
};