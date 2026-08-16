import React, { useState, useEffect, useRef } from 'react';
import type { CardState } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useFaction } from '../../../../contexts/FactionContext';
import { audioService } from '../../../../services/audioService';

interface HandProps {
    hand: CardState[];
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
    playerRole: propPlayerRole,
    currentSiteIndex,
    phase,
    regroupStep,
    onDiscardCard,
}) => {
    const { myPlayerId, fpPlayerId } = useFaction();

    const effectivePlayerId = myPlayerId ?? propPlayerRole ?? '0';
    const isFreePeoplesPlayer = effectivePlayerId === (fpPlayerId ?? '0');
    const shadowPlayerId = (fpPlayerId ?? '0') === '0' ? '1' : '0';

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

    const [discardingIndex, setDiscardingIndex] = useState<number | null>(null);

    // 🟢 DÉTECTION PAR TAMPON D'IDS (Beaucoup plus robuste)
    const [animatingCardIds, setAnimatingCardIds] = useState<Set<string>>(
        new Set()
    );
    const prevIdsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        const currentIds = new Set(hand.map((c) => c.id));

        const addedIds = hand
            .filter((c) => !prevIdsRef.current.has(c.id))
            .map((c) => c.id);

        if (addedIds.length > 0) {
            // 🔊 Déclenche un son par carte ajoutée avec un décalage de 100ms
            addedIds.forEach((_, idx) => {
                setTimeout(() => {
                    audioService.play('CARD_DRAW');
                }, idx * 100);
            });

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
            return () => clearTimeout(timer);
        }

        prevIdsRef.current = currentIds;
    }, [hand]);

    const handleDiscardClick = (idx: number) => {
        if (discardingIndex !== null || !isDiscardPhase) return;

        setDiscardingIndex(idx);

        setTimeout(() => {
            onDiscardCard?.(idx);
            setDiscardingIndex(null);
        }, 450);
    };

    return (
        <S.FixedHandContainer $isDragging={isDragging}>
            <S.CardRow>
                {hand.length === 0
                    ? null
                    : hand.map((card, idx) => {
                          const isMatchingPlayerRole = isFreePeoplesPlayer
                              ? card.kind === 'FREE_PEOPLE'
                              : card.kind === 'SHADOW';

                          const { angle, translateY, zIndex } = getFanStyles(
                              idx,
                              hand.length
                          );

                          const isBeingDragged = dragged?.card.id === card.id;
                          const isDiscarding = discardingIndex === idx;

                          const isNewCard = animatingCardIds.has(card.id);

                          const newCardsList = hand.filter((c) =>
                              animatingCardIds.has(c.id)
                          );
                          const staggerIndex = newCardsList.findIndex(
                              (c) => c.id === card.id
                          );

                          return (
                              <S.CardWrapper
                                  key={card.id}
                                  $angle={angle}
                                  $translateY={translateY}
                                  $zIndex={zIndex}
                                  $isNew={isNewCard}
                                  $staggerIndex={
                                      staggerIndex >= 0 ? staggerIndex : 0
                                  }
                                  $isDiscardPhase={isDiscardPhase}
                                  $isDiscarding={isDiscarding}
                                  data-draggable={
                                      !isDiscardPhase && isMatchingPlayerRole
                                          ? 'true'
                                          : undefined
                                  }
                                  style={{
                                      visibility: isBeingDragged
                                          ? 'hidden'
                                          : 'visible',
                                      width: isBeingDragged ? '0px' : '',
                                      opacity: isBeingDragged ? 0 : undefined,
                                      pointerEvents:
                                          isBeingDragged ||
                                          discardingIndex !== null
                                              ? 'none'
                                              : 'auto',
                                  }}
                                  onClick={(e) => {
                                      if (isDiscardPhase) {
                                          e.stopPropagation();
                                          handleDiscardClick(idx);
                                      }
                                  }}
                                  onPointerDown={(e) => {
                                      if (isDiscardPhase) {
                                          e.stopPropagation();
                                          return;
                                      }

                                      if (
                                          !isMatchingPlayerRole ||
                                          e.button !== 0
                                      )
                                          return;
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
