import React, { useEffect, useRef, useState } from 'react';
import type { CardState } from '../../../../game/types';
import * as S from './styles';

interface OpponentHandProps {
    hand: CardState[];
    hiddenCardId?: string;
}

const knownOpponentCardIdsCache = new Set<string>();

const getInvertedFanStyles = (index: number, total: number) => {
    const baseY = 6;
    if (total <= 1) {
        return { angle: 0, translateY: baseY + 16, zIndex: 1 };
    }

    const midIndex = (total - 1) / 2;
    const angleStep = 5;
    const angle = (midIndex - index) * angleStep;
    const distanceFromCenter = Math.abs(index - midIndex);
    const translateY = baseY + 16 - distanceFromCenter * 10;
    const zIndex = index + 1;

    return { angle, translateY, zIndex };
};

export const OpponentHand: React.FC<OpponentHandProps> = ({
    hand,
    hiddenCardId,
}) => {
    const visibleCards = hiddenCardId
        ? hand.filter((card) => card.id !== hiddenCardId)
        : hand;
    const handIdsKey = hand.map((card) => card.id).join('|');

    const [animatingCardIds, setAnimatingCardIds] = useState<Set<string>>(
        new Set()
    );
    const prevIdsRef = useRef<Set<string>>(
        new Set(knownOpponentCardIdsCache)
    );

    useEffect(() => {
        const currentIds = new Set(hand.map((card) => card.id));
        const addedIds = hand
            .filter((card) => !prevIdsRef.current.has(card.id))
            .map((card) => card.id);

        if (addedIds.length > 0) {
            setAnimatingCardIds((prev) => new Set([...prev, ...addedIds]));

            const timer = setTimeout(
                () => {
                    setAnimatingCardIds((prev) => {
                        const next = new Set(prev);
                        addedIds.forEach((id) => next.delete(id));
                        return next;
                    });
                },
                800 + addedIds.length * 100
            );

            prevIdsRef.current = currentIds;
            currentIds.forEach((id) => knownOpponentCardIdsCache.add(id));

            return () => clearTimeout(timer);
        }

        prevIdsRef.current = currentIds;
        currentIds.forEach((id) => knownOpponentCardIdsCache.add(id));
    }, [hand, handIdsKey]);

    if (visibleCards.length === 0) return null;

    return (
        <S.OpponentHandContainer
            aria-label={`Main adverse, ${visibleCards.length} carte${
                visibleCards.length > 1 ? 's' : ''
            }`}
        >
            <S.OpponentCardRow>
                {visibleCards.map((card, idx) => {
                    const { angle, translateY, zIndex } = getInvertedFanStyles(
                        idx,
                        visibleCards.length
                    );
                    const isNewCard = animatingCardIds.has(card.id);
                    const newCardsList = visibleCards.filter((item) =>
                        animatingCardIds.has(item.id)
                    );
                    const staggerIndex = newCardsList.findIndex(
                        (item) => item.id === card.id
                    );

                    return (
                        <S.OpponentCardWrapper
                            key={card.id}
                            $angle={angle}
                            $translateY={translateY}
                            $zIndex={zIndex}
                            $isNew={isNewCard}
                            $staggerIndex={
                                staggerIndex >= 0 ? staggerIndex : 0
                            }
                        >
                            <S.OpponentCardBack
                                src="interface/lotr_cardback.webp"
                                alt=""
                                draggable={false}
                            />
                        </S.OpponentCardWrapper>
                    );
                })}
            </S.OpponentCardRow>
        </S.OpponentHandContainer>
    );
};
