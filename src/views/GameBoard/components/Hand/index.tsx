import React from 'react';
import type { CardState } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useFaction } from '../../../../contexts/FactionContext';

interface HandProps {
    hand: CardState[];
    deckCount: number;
    playerRole?: '0' | '1';
    currentSiteIndex?: number;
    phase?: string;
    regroupStep?: string;
    onDrawCard: () => void;
    onPlayCard?: (index: number) => void;
    onDiscardCard?: (index: number) => void;
}

export const Hand: React.FC<HandProps> = ({
    hand,
    deckCount,
    playerRole: propPlayerRole,
    currentSiteIndex,
    phase,
    regroupStep,
    onDrawCard,
    onDiscardCard,
}) => {
    const { myPlayerId, fpPlayerId } = useFaction();

    const effectivePlayerId = myPlayerId ?? propPlayerRole ?? '0';
    const isFreePeoplesPlayer = effectivePlayerId === (fpPlayerId ?? '0');
    const shadowPlayerId = (fpPlayerId ?? '0') === '0' ? '1' : '0';

    // 🟢 Condition de défausse basée exactement sur ton moves.ts
    const isShadowRefill =
        regroupStep === 'SHADOW_REFILL' && effectivePlayerId === shadowPlayerId;

    const isFpRefill = regroupStep === 'FP_REFILL' && isFreePeoplesPlayer;

    const isDiscardPhase =
        phase === 'regroup' && (isShadowRefill || isFpRefill);

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

    console.log('--- DEBUG HAND DISCARD ---', {
    phase,
    regroupStep,
    myPlayerId,
    effectivePlayerId,
    shadowPlayerId,
    fpPlayerId,
    isShadowRefill,
    isFpRefill,
    isDiscardPhase
});

    return (
        <S.FixedHandContainer $isDragging={isDragging}>
            <S.GameButton $bgColor="#3498db" onClick={onDrawCard}>
                🃏 Piocher ({deckCount})
            </S.GameButton>

            <S.CardRow>
                {hand.length === 0
                    ? null
                    : hand.map((card, idx) => {
                          const isMatchingPlayerRole = isFreePeoplesPlayer
                              ? card.kind === 'FREE_PEOPLES'
                              : card.kind === 'SHADOW';

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
                                  $isDiscardPhase={isDiscardPhase}
                                  data-draggable={
                                      !isDiscardPhase && isMatchingPlayerRole
                                          ? 'true'
                                          : undefined
                                  }
                                  style={{
                                      width: isBeingDragged ? '0px' : '',
                                      opacity: isBeingDragged ? 0 : 1,
                                      pointerEvents: isBeingDragged
                                          ? 'none'
                                          : 'auto',
                                      transition:
                                          'all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                  }}
                                  onClick={(e) => {
        console.log('👉 CLIC DETECTE SUR CARTE', idx, { isDiscardPhase });
        if (isDiscardPhase) {
            e.stopPropagation();
            if (onDiscardCard) {
                console.log('🚀 APPEL DE ON DISCARD CARD', idx);
                onDiscardCard(idx);
            } else {
                console.error('❌ prop onDiscardCard est UNDEFINED !');
            }
        }
    }}
                                  onPointerDown={(e) => {
        // En phase de défausse, on bloque net le PointerDown pour empêcher le Drag
        if (isDiscardPhase) {
            e.stopPropagation();
            return;
        }

        if (!isMatchingPlayerRole || e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();
        startDrag(card, idx, e);
    }}
                              >
                                  <Card
                                      card={card}
                                      isPlayable={
                                          isDiscardPhase
                                              ? true
                                              : isMatchingPlayerRole
                                      }
                                      index={idx}
                                      isDraggable={
                                          !isDiscardPhase &&
                                          isMatchingPlayerRole
                                      }
                                      size="md"
                                      currentSiteIndex={currentSiteIndex}
                                  />
                              </S.CardWrapper>
                          );
                      })}
            </S.CardRow>
        </S.FixedHandContainer>
    );
};
