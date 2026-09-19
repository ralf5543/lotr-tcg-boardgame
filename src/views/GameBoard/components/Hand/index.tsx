import React, { useState, useEffect, useRef } from 'react';
import type { CardState, GameState } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useFaction } from '../../../../contexts/FactionContext';
import { useTargeting } from '../../../../contexts/TargetingContext';
import { audioService } from '../../../../services/audioService';
import { canPlayCard, attachesToSite } from '../../../../game/engine/canPlayCard';
import {
    getHandEventDesignationTargetIds,
    getToPlayExertTargetIds,
} from '../../../../game/engine/abilities/designation';
import {
    hasSpotCondition,
    isSpotConditionMet,
} from '../../../../game/engine/validations/checkToPlayConditions';

interface HandProps {
    hand: CardState[];
    G: GameState;
    playerRole?: '0' | '1';
    currentSiteIndex?: number;
    phase?: string;
    regroupStep?: string;
    onDrawCard?: () => void;
    onPlayCard?: (index: number) => void;
    onDiscardCard?: (index: number) => void;
    onDiscardForMuster?: (index: number) => void;
}

// 🟢 CACHE GLOBAL : Persiste même si le composant Hand est démonté / remonté lors d'un changement d'onglet
const knownCardIdsCache = new Set<string>();

export const Hand: React.FC<HandProps> = ({
    hand,
    G,
    playerRole: propPlayerRole,
    currentSiteIndex,
    phase,
    regroupStep,
    onDiscardCard,
    onDiscardForMuster,
}) => {
    const { myPlayerId, fpPlayerId } = useFaction();

    const effectivePlayerId = myPlayerId ?? propPlayerRole ?? '0';
    const isFreePeoplesPlayer = effectivePlayerId === (fpPlayerId ?? '0');
    const shadowPlayerId = (fpPlayerId ?? '0') === '0' ? '1' : '0';

    const isShadowRefill =
        regroupStep === 'SHADOW_REFILL' && effectivePlayerId === shadowPlayerId;
    const isFpRefill = regroupStep === 'FP_REFILL' && isFreePeoplesPlayer;

    // 🟢 PRISE EN COMPTE DE L'ÉTAPE MUSTER (Élargie à START_OF_REGROUP)
    const myMusterState = G?.musterState?.players?.[effectivePlayerId];
    const isMusterActive =
        (regroupStep === 'MUSTER_STEP' ||
            regroupStep === 'START_OF_REGROUP' ||
            phase === 'START_OF_REGROUP') &&
        !!myMusterState &&
        !myMusterState.isDone &&
        myMusterState.discardedCount < myMusterState.allowedCount;

    const isDiscardPhase =
        (phase === 'regroup' && (isShadowRefill || isFpRefill)) ||
        isMusterActive;

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
    const {
        targetingKind,
        pendingCard,
        isCardTargetable,
        selectCard,
        upTo,
        selectedCardIds,
        onConfirm,
        confirmNonce,
    } = useTargeting();
    const isDragging = !!dragged;
    const isDesignating =
        targetingKind === 'DESIGNATION' || targetingKind === 'SITE_ATTACH';
    const isHandDiscard = targetingKind === 'HAND_DISCARD';
    const enginePendingId =
        G.pendingPlay?.playerId === effectivePlayerId
            ? G.pendingPlay.card.id
            : undefined;
    const pendingCardId = pendingCard?.id ?? enginePendingId;

    const [discardingIndex, setDiscardingIndex] = useState<number | null>(null);
    const [discardingIds, setDiscardingIds] = useState<Set<string>>(
        new Set()
    );
    const handDiscardTimeoutsRef = useRef<number[]>([]);
    const lastConfirmNonceRef = useRef(0);

    const [animatingCardIds, setAnimatingCardIds] = useState<Set<string>>(
        new Set()
    );
    const prevIdsRef = useRef<Set<string>>(new Set(knownCardIdsCache));

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

            // Met à jour la Ref locale ET le cache global du module
            prevIdsRef.current = currentIds;
            currentIds.forEach((id) => knownCardIdsCache.add(id));

            return () => clearTimeout(timer);
        }

        // Met à jour la Ref locale ET le cache global du module
        prevIdsRef.current = currentIds;
        currentIds.forEach((id) => knownCardIdsCache.add(id));
    }, [hand]);

    useEffect(() => {
        if (isHandDiscard) return;
        handDiscardTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
        handDiscardTimeoutsRef.current = [];
        setDiscardingIds(new Set());
    }, [isHandDiscard]);

    // Validation « up to » : même animation fly-up que la défausse carte par carte.
    useEffect(() => {
        if (!confirmNonce || confirmNonce === lastConfirmNonceRef.current) {
            return;
        }
        if (!isHandDiscard || !onConfirm) return;
        lastConfirmNonceRef.current = confirmNonce;

        if (selectedCardIds.length === 0) {
            onConfirm();
            return;
        }

        setDiscardingIds(new Set(selectedCardIds));
        const timeoutId = window.setTimeout(() => {
            onConfirm();
        }, 450);
        handDiscardTimeoutsRef.current.push(timeoutId);
        return () => window.clearTimeout(timeoutId);
    }, [confirmNonce, isHandDiscard, onConfirm, selectedCardIds]);

    const handleDiscardClick = (idx: number) => {
        if (discardingIndex !== null || !isDiscardPhase) return;

        setDiscardingIndex(idx);

        setTimeout(() => {
            if (isMusterActive) {
                onDiscardForMuster?.(idx);
            } else {
                onDiscardCard?.(idx);
            }
            setDiscardingIndex(null);
        }, 450);
    };

    const handleHandDiscardClick = (cardKey: string) => {
        if (discardingIds.has(cardKey)) return;
        if (upTo) {
            selectCard(cardKey);
            return;
        }
        setDiscardingIds((prev) => new Set([...prev, cardKey]));
        const timeoutId = window.setTimeout(() => {
            selectCard(cardKey);
        }, 450);
        handDiscardTimeoutsRef.current.push(timeoutId);
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
                          const isPendingPlay = pendingCardId === card.id;
                          const isHidden = isBeingDragged || isPendingPlay;
                          const cardKey = card.instanceId || card.id;
                          const isDiscarding =
                              discardingIndex === idx ||
                              discardingIds.has(cardKey);

                          const isNewCard = animatingCardIds.has(card.id);

                          const newCardsList = hand.filter((c) =>
                              animatingCardIds.has(c.id)
                          );
                          const staggerIndex = newCardsList.findIndex(
                              (c) => c.id === card.id
                          );

                          const hasSpot = hasSpotCondition(card);
                          const isSpotMet = hasSpot
                              ? isSpotConditionMet(card, {
                                    G,
                                    ctx: {} as any,
                                    playerID: effectivePlayerId,
                                })
                              : false;

                          const isPlayableEvent =
                              !isDiscardPhase &&
                              card.type === 'EVENT' &&
                              isMatchingPlayerRole &&
                              canPlayCard(card, {
                                  G,
                                  ctx: { phase },
                                  playerID: effectivePlayerId,
                              }).valid;

                          const siteAttachExertIds =
                              !isDiscardPhase &&
                              isMatchingPlayerRole &&
                              attachesToSite(card) &&
                              canPlayCard(card, {
                                  G,
                                  ctx: { phase },
                                  playerID: effectivePlayerId,
                              }).valid
                                  ? getToPlayExertTargetIds(G, card)
                                  : [];

                          const designationTargetIds = isPlayableEvent
                              ? getHandEventDesignationTargetIds(
                                    G,
                                    card,
                                    phase
                                )
                              : siteAttachExertIds.length > 0
                                ? siteAttachExertIds
                                : undefined;

                          const usesArrowDesignation =
                              Boolean(designationTargetIds?.length);

                          const isHandDiscardSelected =
                              isHandDiscard &&
                              selectedCardIds.includes(cardKey);
                          const isHandDiscardTarget =
                              isHandDiscard &&
                              isCardTargetable(cardKey) &&
                              !discardingIds.has(cardKey);

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
                                  $isDiscardPhase={
                                      isDiscardPhase || isHandDiscard
                                  }
                                  $isDiscarding={isDiscarding}
                                  $isSelected={isHandDiscardSelected}
                                  $hasSpot={hasSpot}
                                  $isSpotMet={isSpotMet}
                                  $isPlayableEvent={
                                      isPlayableEvent ||
                                      isHandDiscardTarget ||
                                      usesArrowDesignation
                                  }
                                  data-draggable={
                                      !isDiscardPhase &&
                                      isMatchingPlayerRole &&
                                      !isHandDiscard
                                          ? 'true'
                                          : undefined
                                  }
                                  style={{
                                      visibility: isHidden
                                          ? 'hidden'
                                          : 'visible',
                                      width: isHidden ? '0px' : '',
                                      opacity: isHidden ? 0 : undefined,
                                      pointerEvents:
                                          isHidden ||
                                          isDesignating ||
                                          discardingIndex !== null
                                              ? 'none'
                                              : 'auto',
                                  }}
                                  onClick={(e) => {
                                      if (isHandDiscard) {
                                          e.stopPropagation();
                                          if (isHandDiscardTarget) {
                                              handleHandDiscardClick(cardKey);
                                          }
                                          return;
                                      }
                                      if (isDiscardPhase) {
                                          e.stopPropagation();
                                          handleDiscardClick(idx);
                                      }
                                  }}
                                  onPointerDown={(e) => {
                                      if (isDiscardPhase || isHandDiscard) {
                                          e.stopPropagation();
                                          return;
                                      }

                                      if (isDesignating) return;

                                      if (
                                          !isMatchingPlayerRole ||
                                          e.button !== 0
                                      )
                                          return;
                                      e.stopPropagation();
                                      e.preventDefault();
                                      startDrag(
                                          card,
                                          idx,
                                          e,
                                          'HAND',
                                          'portrait',
                                          undefined,
                                          isPlayableEvent ||
                                              usesArrowDesignation,
                                          designationTargetIds
                                      );
                                  }}
                              >
                                  <Card
                                      card={card}
                                      isPlayable={
                                          isDiscardPhase || isHandDiscardTarget
                                              ? true
                                              : isMatchingPlayerRole
                                      }
                                      isPlayableEvent={
                                          isPlayableEvent ||
                                          isHandDiscardTarget ||
                                          usesArrowDesignation
                                      }
                                      designationTargetIds={
                                          designationTargetIds
                                      }
                                      index={idx}
                                      isDraggable={
                                          !isDiscardPhase &&
                                          !isHandDiscard &&
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