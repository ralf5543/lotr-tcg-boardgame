import type { CardState } from '../../../../game/types';

interface InPlayDragOptions {
    card: CardState;
    phase?: string;
    isOpponent?: boolean;
    isDisabled?: boolean;
    isTargetable?: boolean;
    isFpOwner?: boolean;
    isAttachment?: boolean;
}

/** L'Anneau Unique (`type: RING`), pas une possession subtype RING. */
const isTheOneRing = (card: CardState): boolean => card.type === 'RING';

/** Attachement transférable : tout sauf l'Anneau Unique et les Suivants (AID). */
const isTransferableAttachment = (card: CardState): boolean =>
    !isTheOneRing(card) && card.type !== 'FOLLOWER';

/**
 * Drag des cartes en jeu uniquement.
 * La main n'utilise pas ce helper : elle reste draggable via Hand.tsx.
 */
export function isInPlayCardDraggable({
    card,
    phase,
    isOpponent = false,
    isDisabled = false,
    isTargetable = false,
    isFpOwner = false,
    isAttachment = false,
}: InPlayDragOptions): boolean {
    if (isDisabled || isTargetable) return false;

    if (phase === 'fellowship') {
        if (isOpponent || !isFpOwner || card.kind !== 'FREE_PEOPLE') {
            return false;
        }
        if (isAttachment) {
            return isTransferableAttachment(card);
        }
        return card.type === 'COMPANION';
    }

    if (phase === 'shadow') {
        if (isOpponent || isFpOwner || card.kind !== 'SHADOW') {
            return false;
        }
        return isAttachment && isTransferableAttachment(card);
    }

    if (phase === 'startOfManeuver') {
        if (isOpponent || isAttachment) return false;
        return (
            card.type === 'FOLLOWER' &&
            !card.attachedViaAid &&
            !card.attachedTo
        );
    }

    if (phase === 'assignment') {
        return !isAttachment && card.type === 'MINION';
    }

    return false;
}
