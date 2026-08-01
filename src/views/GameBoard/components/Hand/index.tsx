import React from 'react';
import type { CardState } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';

interface HandProps {
    hand: CardState[];
    deckCount: number;
    playerRole: '0' | '1'; // '0' = Free Peoples, '1' = Shadow
    currentSiteIndex?: number; // 🟢 Reçu du GameBoard / Board principal
    onDrawCard: () => void;
    onPlayCard?: (index: number) => void;
}

export const Hand: React.FC<HandProps> = ({
    hand,
    deckCount,
    playerRole,
    currentSiteIndex, // 🟢 Récupération de la prop
    onDrawCard,
}) => {
    const getFanStyles = (index: number, total: number) => {
        const baseY = -60;
        if (total <= 1) {
            return { angle: 0, translateY: baseY, zIndex: 1 };
        }

        const midIndex = (total - 1) / 2;
        const angleStep = 5;
        const angle = (index - midIndex) * angleStep;
        const distanceFromCenter = Math.abs(index - midIndex);
        const translateY = baseY + distanceFromCenter * 20;
        const zIndex = index + 1;

        return { angle, translateY, zIndex };
    };

    const { startDrag, dragged } = useDrag();
    const isDragging = !!dragged;

    return (
        <S.FixedHandContainer $isDragging={isDragging}>
            <S.GameButton $bgColor="#3498db" onClick={onDrawCard}>
                🃏 Piocher ({deckCount})
            </S.GameButton>

            <S.CardRow>
                {hand.length === 0 ? (
                    true
                ) : (
                    hand.map((card, idx) => {
                        const isMatchingPlayerRole =
                            (playerRole === '0' && card.kind === 'FREE_PEOPLES') ||
                            (playerRole === '1' && card.kind === 'SHADOW');

                        const { angle, translateY, zIndex } = getFanStyles(
                            idx,
                            hand.length
                        );

                        const isBeingDragged = dragged?.card.id === card.id;

                        return (
                            <S.CardWrapper
                                key={card.id}
                                $angle={angle}
                                $translateY={translateY}
                                $zIndex={zIndex}
                                data-draggable="true"
                                style={{
                                    width: isBeingDragged ? '0px' : '',
                                    opacity: isBeingDragged ? 0 : 1,
                                    pointerEvents: isBeingDragged
                                        ? 'none'
                                        : 'auto',
                                    transition:
                                        'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                }}
                                onPointerDown={(e) => {
                                    if (e.button !== 0) return;
                                    e.stopPropagation();
                                    e.preventDefault();

                                    startDrag(card, idx, e);
                                }}
                            >
                                <Card
                                    card={card}
                                    isPlayable={isMatchingPlayerRole}
                                    index={idx}
                                    isDraggable={true}
                                    size="md"
                                    currentSiteIndex={currentSiteIndex} // 🟢 Transmis à Card !
                                />
                            </S.CardWrapper>
                        );
                    })
                )}
            </S.CardRow>
        </S.FixedHandContainer>
    );
};