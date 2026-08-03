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
    onDrawCard: () => void;
    onPlayCard?: (index: number) => void;
}

export const Hand: React.FC<HandProps> = ({
    hand,
    deckCount,
    playerRole: propPlayerRole,
    currentSiteIndex,
    phase,
    onDrawCard,
}) => {
    const { myPlayerId, fpPlayerId } = useFaction();

    const effectivePlayerId = myPlayerId ?? propPlayerRole ?? '0';
    // Est Peuples Libres si mon ID correspond à l'ID FP actuel du contexte
    const isFreePeoplesPlayer = effectivePlayerId === (fpPlayerId ?? '0');

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
                                  data-draggable={
                                      isMatchingPlayerRole ? 'true' : undefined
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
                                  onPointerDown={(e) => {
                                      if (
                                          !isMatchingPlayerRole ||
                                          e.button !== 0
                                      ) {
                                          console.warn('[Hand] Drop ignoré :', {
                                              reason: !isMatchingPlayerRole
                                                  ? 'Carte non jouable dans cette phase/rôle'
                                                  : 'Clic non principal',
                                              cardKind: card.kind,
                                              isFreePeoplesPlayer,
                                              phase,
                                          });
                                          return;
                                      }
                                      e.stopPropagation();
                                      e.preventDefault();

                                      startDrag(card, idx, e);
                                  }}
                              >
                                  <Card
                                      card={card}
                                      isPlayable={isMatchingPlayerRole}
                                      index={idx}
                                      isDraggable={isMatchingPlayerRole}
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
