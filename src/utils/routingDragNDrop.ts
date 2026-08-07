import type { CardType } from '../game/types';

export const canDropInSupportArea = (type?: CardType): boolean => {
    if (!type) return false;
    return (
        type === 'ALLY' ||
        type === 'POSSESSION_SUPPORT' ||
        type === 'ARTIFACT_SUPPORT' ||
        type === 'FOLLOWER' ||
        type === 'CONDITION_SUPPORT'
    );
};

export const canDropInFellowship = (type?: CardType): boolean => {
    if (!type) return false;
    return type === 'COMPANION';
};

export const canAttachToCharacter = (type?: CardType): boolean => {
    if (!type) return false;
    return (
        type === 'POSSESSION_CHARACTER' ||
        type === 'ARTIFACT_CHARACTER' ||
        type === 'CONDITION_CHARACTER' ||
        type === 'THE-ONE-RING'
    );
};