import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { CardState, CardType, GameState } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useLocalFaction } from '../../../../contexts/FactionContext';
import { useTargeting } from '../../../../contexts/TargetingContext';
import { useTargetingArrowSync } from '../TargetingArrow/TargetingArrowSync';
import { canPlayCard, canAttachToCharacter } from '../../../../game/engine/canPlayCard';
import { SkirmishClash } from './SkirmishClash';
import { getEffectiveVitality } from '../../../../utils/cardStats';
import { canTransferAid } from '../../../../game/engine/validations/canTransferAid';
import { isInPlayCardDraggable } from './isInPlayCardDraggable';
import { canCompanionBeAssigned } from '../../../../game/logic/assignment';
import { useAssignedMinionsTrack } from '../PlayerArea/AssignedMinionsTrackContext';
import { isCostlessPlayFromCardStack } from '../../../../game/engine/abilities/applyAbilityEffect';
import { abilityMatchesPhase } from '../../../../game/engine/abilities/collectAbilities';
import {
    abilityHasLegalEffectTarget,
    getEffectDesignationCandidates,
} from '../../../../game/engine/abilities/designation';
import { canPayAbilityCost } from '../../../../game/engine/abilities/payAbilityCost';

/** Aperçus visibles sur l’hôte ; le reste via pastille ×N → grille. */
const MAX_STACK_PEEKS = 4;

interface BoardCharacterStackProps {
    character: CardState;
    index: number;
    isOpponent?: boolean;
    currentSiteIndex?: number;
    onStartDrag?: (e: React.PointerEvent) => void;
    phase?: string;
    isSkirmishPhase?: boolean;
    isActionable?: boolean;
    skirmishId?: string;
    assignedMinions?: CardState[];
    onSelectSkirmish?: (skirmishId: string) => void;
    isSelectedSkirmish?: boolean;
    isSelectionAllowed?: boolean;
    isWounded?: boolean;
    isDead?: boolean;
    isDisabled?: boolean;
    burdens: number;
    isFaceDown: boolean;
    G: GameState;
    playerID: string;
    onActivateAbility?: (
        sourceInstanceId: string,
        abilityId: string,
        chosenTargetId?: string
    ) => void;
}

export const BoardCharacterStack: React.FC<BoardCharacterStackProps> = ({
    character,
    G,
    playerID,
    index,
    isOpponent = false,
    currentSiteIndex,
    onStartDrag,
    isActionable,
    phase,
    isSkirmishPhase = false,
    skirmishId,
    assignedMinions = [],
    onSelectSkirmish,
    isSelectedSkirmish = false,
    isSelectionAllowed = true,
    isWounded = false,
    isDead = false,
    isDisabled = false,
    burdens = 0,
    isFaceDown = false,
    onActivateAbility,
}) => {
    const { registerTarget, registerArrowAnchor, activeTargetId, dragged, startDrag, isOverHandCancel } =
        useDrag();
    const { isCardTargetable, selectCard, targetingKind, hoveredTargetId } =
        useTargeting();
    const arrowSync = useTargetingArrowSync();
    const remoteTargetId = arrowSync?.remote?.toCardId;
    const myFaction = useLocalFaction();

    const stackedCards = character.stacked || [];
    const stackTruncated = stackedCards.length > MAX_STACK_PEEKS;
    const stackPeeks = stackTruncated
        ? stackedCards.slice(stackedCards.length - MAX_STACK_PEEKS)
        : stackedCards;
    const stackPeekOffset = stackedCards.length - stackPeeks.length;

    /** Play from stack sans coût (Web / Goblin Swarms) : drag comme depuis la main. */
    const directStackPlay = useMemo(() => {
        if (!G || !phase || isOpponent) return null;
        const ability = (character.abilities || []).find(
            (ab) =>
                isCostlessPlayFromCardStack(ab) &&
                abilityMatchesPhase(ab, phase) &&
                canPayAbilityCost(G, character, ab.cost) &&
                abilityHasLegalEffectTarget(G, character, ab)
        );
        if (!ability) return null;
        // Même filtre que le runtime (crépuscule inclus) — halo seulement si jouable.
        const candidates = getEffectDesignationCandidates(
            G,
            character,
            ability
        );
        if (candidates.length === 0) return null;
        return { ability, candidates };
    }, [G, phase, isOpponent, character]);

    const directStackPlayIds = useMemo(() => {
        if (!directStackPlay) return null;
        return new Set(
            directStackPlay.candidates.flatMap((c) =>
                [c.instanceId, c.id].filter(Boolean) as string[]
            )
        );
    }, [directStackPlay]);

    const cardKey = character.instanceId || character.id;
    const isTargetable =
        isCardTargetable(cardKey) || isCardTargetable(character.id);
    const isInCombat = assignedMinions.length > 0;
    const dragDesignationIds = dragged?.designationTargetIds;
    const isDragDesignating =
        Boolean(dragDesignationIds?.length) && !isOverHandCancel;
    const isDragDesignationCandidate = (id: string, altId?: string) =>
        Boolean(
            isDragDesignating &&
                (dragDesignationIds!.includes(id) ||
                    (altId && dragDesignationIds!.includes(altId)))
        );
    const isDesignationTarget =
        (isTargetable &&
            (targetingKind === 'DESIGNATION' ||
                targetingKind === 'SANCTUARY_HEAL')) ||
        isDragDesignationCandidate(cardKey, character.id);

    // 🟢 Extraction distincte du TYPE et du SUBTYPE
    const draggedType = (dragged?.card as CardState)?.type as
        | CardType
        | undefined;

    const isBeingDragged = dragged?.card?.id === character.id;

    const isFpOwner = playerID === (G.fpPlayerId || '0');

    const canDragCharacter = isInPlayCardDraggable({
        card: character,
        phase,
        assignmentStep: G.assignmentStep,
        isOpponent,
        isDisabled,
        isTargetable,
        isFpOwner,
    });

    const isMinionAssignment =
        dragged?.origin === 'BATTLEFIELD' && draggedType === 'MINION';
    const canReceiveAssignment =
        isMinionAssignment &&
        phase === 'assignment' &&
        (G.assignmentStep === 'FP_ASSIGN' ||
            G.assignmentStep === 'SHADOW_ASSIGN') &&
        (character.type === 'COMPANION' || character.type === 'ALLY') &&
        canCompanionBeAssigned(character);

    // On récupère la carte complète en cours de drag
    const draggedCard = dragged?.card as CardState | undefined;

    // Validation d'attachement adaptative (Main = canPlayCard / SupportArea = canTransferAid)
    let canAttach = false;
    if (draggedCard) {
        if (draggedCard.type === 'EVENT') {
            canAttach = false;
        } else if (dragged?.origin === 'HAND') {
            canAttach = canPlayCard(
                draggedCard,
                { G, ctx: {} as any, playerID },
                character.id,
                character,
                { ignorePhase: true }
            ).valid;
        } else if (dragged?.origin === 'ATTACHMENT') {
            const parentId = dragged.parentId;
            const sameHost =
                parentId === character.instanceId || parentId === character.id;
            canAttach =
                !sameHost && canAttachToCharacter(draggedCard, character);
        } else if (draggedCard.type === 'FOLLOWER') {
            canAttach = canTransferAid(
                draggedCard,
                character,
                G,
                playerID
            ).valid;
        }
    }

    const matchesAimedCard = (id: string, altId?: string) => {
        const aimedIds = [remoteTargetId, hoveredTargetId];
        if (isDragDesignating) {
            aimedIds.push(activeTargetId);
        }
        return aimedIds.some(
            (aimedId) => aimedId && (aimedId === id || aimedId === altId)
        );
    };

    const factionForAim = (id: string, altId?: string) => {
        const isLocal =
            hoveredTargetId === id ||
            hoveredTargetId === altId ||
            (isDragDesignating &&
                (activeTargetId === id || activeTargetId === altId));
        if (isLocal) return myFaction;
        if (remoteTargetId === id || remoteTargetId === altId) {
            return arrowSync?.remote?.faction === 'SHADOW'
                ? 'SHADOW'
                : 'FREE_PEOPLE';
        }
        return myFaction;
    };

    // 🎯 Matching avec instanceId prioritaire, sinon id
    const currentId = character.instanceId || character.id;
    const isAimedByArrow = matchesAimedCard(currentId, character.id);
    const aimFaction = factionForAim(currentId, character.id);
    const isTargeted =
        ((activeTargetId === currentId || activeTargetId === character.id) &&
            ((!isOpponent && canAttach) || canReceiveAssignment)) ||
        isAimedByArrow;

    // Règle de sélection d'escarmouche
    const canSelectThisSkirmish =
        isSkirmishPhase &&
        Boolean(skirmishId) &&
        assignedMinions.length > 0 &&
        isSelectionAllowed;

    const handleStackClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        // Menaces / flèches / désignation : le clic sert au ciblage, pas au combat.
        if (
            targetingKind === 'THREAT_WOUND' ||
            targetingKind === 'ARCHERY' ||
            targetingKind === 'DESIGNATION' ||
            targetingKind === 'SANCTUARY_HEAL'
        ) {
            return;
        }

        if (!canSelectThisSkirmish || isSelectedSkirmish) return;

        if (isSkirmishPhase && skirmishId && onSelectSkirmish) {
            onSelectSkirmish(skirmishId);
        }
    };

    const companionAnchorRef = useRef<HTMLDivElement | null>(null);
    const { track, scroller } = useAssignedMinionsTrack();
    const [overlayPos, setOverlayPos] = useState<{
        left: number;
        top: number;
    } | null>(null);
    const [pairHovered, setPairHovered] = useState(false);
    const pairHoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(
        null
    );

    const enterPairHover = () => {
        if (pairHoverLeaveTimer.current != null) {
            clearTimeout(pairHoverLeaveTimer.current);
            pairHoverLeaveTimer.current = null;
        }
        setPairHovered(true);
    };

    /** Délai court : le portail sépare compagnon et séides (gap ~26px). */
    const leavePairHover = () => {
        if (pairHoverLeaveTimer.current != null) {
            clearTimeout(pairHoverLeaveTimer.current);
        }
        pairHoverLeaveTimer.current = setTimeout(() => {
            pairHoverLeaveTimer.current = null;
            setPairHovered(false);
        }, 40);
    };

    useLayoutEffect(() => {
        if (assignedMinions.length === 0) {
            setOverlayPos(null);
            return;
        }
        const place = () => {
            const layer = track;
            const anchor = companionAnchorRef.current;
            if (!layer || !anchor) return false;
            const lr = layer.getBoundingClientRect();
            const ar = anchor.getBoundingClientRect();
            const scale = lr.width / Math.max(layer.offsetWidth, 1);
            const left = (ar.left + ar.width / 2 - lr.left) / scale;
            const top = isOpponent
                ? (ar.bottom - lr.top) / scale + 26
                : (ar.top - lr.top) / scale - 26;
            setOverlayPos((prev) => {
                if (
                    prev &&
                    Math.abs(prev.left - left) < 0.5 &&
                    Math.abs(prev.top - top) < 0.5
                ) {
                    return prev;
                }
                return { left, top };
            });
            return true;
        };

        place();
        const ro = new ResizeObserver(place);
        if (track) ro.observe(track);
        if (companionAnchorRef.current) ro.observe(companionAnchorRef.current);
        scroller?.addEventListener('scroll', place, { passive: true });
        window.addEventListener('resize', place);
        return () => {
            ro.disconnect();
            scroller?.removeEventListener('scroll', place);
            window.removeEventListener('resize', place);
        };
    }, [assignedMinions, isOpponent, track, scroller]);

    useLayoutEffect(() => {
        return () => {
            if (pairHoverLeaveTimer.current != null) {
                clearTimeout(pairHoverLeaveTimer.current);
            }
        };
    }, []);

    const showPairHalo = pairHovered && canSelectThisSkirmish;

    return (
        <S.SkirmishGroup
            $isSelected={isSelectedSkirmish}
            $isOpponent={isOpponent}
            $isSelectable={canSelectThisSkirmish}
            $isPairHovered={showPairHalo}
            onClick={handleStackClick}
            onMouseEnter={enterPairHover}
            onMouseLeave={leavePairHover}
        >
            <S.CharacterStack $isBeingDragged={isBeingDragged}>
                {/* 🟢 SÉIDES ASSIGNÉS — hors du CardScroller, collés au compagnon */}
                {assignedMinions.length > 0 &&
                    overlayPos &&
                    track &&
                    createPortal(
                    <S.AssignedMinionsContainer
                        $isOpponent={isOpponent}
                        $portaled
                        $isPairHovered={showPairHalo}
                        className="assigned-minions-group"
                        style={{ left: overlayPos.left, top: overlayPos.top }}
                        onMouseEnter={enterPairHover}
                        onMouseLeave={leavePairHover}
                        onClick={handleStackClick}
                    >
                        <S.MinionsPyramid $isOpponent={isOpponent}>
                        {assignedMinions.map((minion) => {
                            const minionKey = minion.instanceId || minion.id;
                            const isMinionTargetable =
                                isCardTargetable(minionKey) ||
                                isCardTargetable(minion.id);
                            const isMinionDesignationTarget =
                                (isMinionTargetable &&
                                    targetingKind === 'DESIGNATION') ||
                                isDragDesignationCandidate(
                                    minionKey,
                                    minion.id
                                );
                            const isMinionWounded = Boolean(
                                minion.wounds && minion.wounds > 0
                            );
                            const isMinionDead =
                                getEffectiveVitality(minion) <= 0;
                            const isMinionAimed = matchesAimedCard(
                                minionKey,
                                minion.id
                            );

                            return (
                                <S.MinionWrapper
                                    key={minion.instanceId || minion.id}
                                    ref={(el) => {
                                        registerArrowAnchor(minionKey, el);
                                        if (
                                            minion.id &&
                                            minion.id !== minionKey
                                        ) {
                                            registerArrowAnchor(minion.id, el);
                                        }
                                        if (isMinionDesignationTarget && el) {
                                            registerTarget(minionKey, el);
                                            if (
                                                minion.id &&
                                                minion.id !== minionKey
                                            ) {
                                                registerTarget(minion.id, el);
                                            }
                                        } else {
                                            registerTarget(minionKey, null);
                                            if (
                                                minion.id &&
                                                minion.id !== minionKey
                                            ) {
                                                registerTarget(minion.id, null);
                                            }
                                        }
                                    }}
                                    $isTargetable={isMinionTargetable}
                                    $isDesignationTarget={
                                        isMinionDesignationTarget
                                    }
                                    $isTargeted={isMinionAimed}
                                    $aimFaction={factionForAim(
                                        minionKey,
                                        minion.id
                                    )}
                                    $suppressHoverScale
                                    onClick={(e) => {
                                        if (isMinionTargetable) {
                                            e.stopPropagation();
                                            selectCard(minionKey);
                                        }
                                    }}
                                >
                                    {/* 1. Carte du séide */}
                                    <Card
                                        card={minion}
                                        size="sm"
                                        isDraggable={false}
                                        isWounded={isMinionWounded}
                                        isDead={isMinionDead}
                                        isDisabled={isDisabled}
                                        isOpponent={!isOpponent}
                                        isActionable={isActionable}
                                        G={G}
                                        phase={phase}
                                        playerID={playerID}
                                        onActivateAbility={onActivateAbility}
                                    />

                                    {/* 2. Attachements portés par ce séide assigné */}
                                    {minion.attachments &&
                                        minion.attachments.length > 0 && (
                                            <S.AttachmentsContainer className="attachments-group">
                                                {minion.attachments.map(
                                                    (attachment, attachIdx) => (
                                                        <S.AttachmentWrapper
                                                            key={
                                                                attachment.instanceId ||
                                                                attachment.id
                                                            }
                                                            $index={attachIdx}
                                                        >
                                                            <Card
                                                                card={
                                                                    attachment
                                                                }
                                                                size="sm"
                                                                isDisabled={
                                                                    isDisabled
                                                                }
                                                                isActionable={
                                                                    isActionable
                                                                }
                                                                isDraggable={
                                                                    false
                                                                }
                                                                G={G}
                                                            />
                                                        </S.AttachmentWrapper>
                                                    )
                                                )}
                                            </S.AttachmentsContainer>
                                        )}
                                </S.MinionWrapper>
                            );
                        })}
                        </S.MinionsPyramid>
                        {isSelectedSkirmish && (
                            <SkirmishClash $isOpponent={isOpponent} />
                        )}
                    </S.AssignedMinionsContainer>,
                    track
                )}

                {/* CARTE PRINCIPALE (Compagnon ou Séide solo) */}
                <S.CardDragTarget
                    $isOpponent={isOpponent}
                    $isTargeted={isTargeted}
                    $aimFaction={aimFaction}
                    $isTargetable={isTargetable}
                    $isDesignationTarget={isDesignationTarget}
                    $suppressHoverScale={isInCombat}
                    $suppressHoverHalo={canSelectThisSkirmish}
                    $isDead={isDead}
                    $isDisabled={isDisabled}
                    data-card={JSON.stringify(character)}
                    data-draggable={canDragCharacter ? 'true' : undefined}
                    ref={(el) => {
                        companionAnchorRef.current = el;
                        const id = character.instanceId || character.id;
                        registerTarget(id, el);
                        registerArrowAnchor(id, el);
                        if (
                            character.id &&
                            character.id !== id
                        ) {
                            registerTarget(character.id, el);
                            registerArrowAnchor(character.id, el);
                        }
                    }}
                    onPointerDown={(e) => {
                        // 🎯 Si c'est ciblable, on déclenche directement la sélection au clic
                        if (isTargetable) {
                            e.stopPropagation();
                            selectCard(
                                isCardTargetable(cardKey)
                                    ? cardKey
                                    : character.id
                            );
                            return;
                        }

                        if (!canDragCharacter || e.button !== 0) return;

                        if (onStartDrag) {
                            onStartDrag(e);
                        } else {
                            startDrag(
                                character,
                                index,
                                e,
                                'BATTLEFIELD',
                                'portrait'
                            );
                        }
                    }}
                    onClick={(e) => {
                        // pointerDown assigne déjà (menaces / flèches) : ne pas laisser
                        // le clic remonter au groupe et démarrer un combat.
                        if (isTargetable) e.stopPropagation();
                    }}
                >
                    {isDead && <S.DeathPicto src="/interface/UI/skull.webp" />}
                    <Card
                        card={character}
                        size="sm"
                        isDraggable={canDragCharacter}
                        currentSiteIndex={currentSiteIndex}
                        isWounded={isWounded}
                        isDead={isDead}
                        isDisabled={isDisabled}
                        isActionable={isActionable}
                        isOpponent={isOpponent}
                        burdens={burdens}
                        isFaceDown={isFaceDown}
                        G={G}
                        phase={phase}
                        playerID={playerID}
                        onActivateAbility={onActivateAbility}
                    />
                </S.CardDragTarget>

                {/* ATTACHEMENTS CLASSIQUES */}
                {character.attachments && character.attachments.length > 0 && (
                    <S.AttachmentsContainer className="attachments-group">
                        {character.attachments.map((attachment, attachIdx) => {
                            const canDragAttachment = isInPlayCardDraggable({
                                card: attachment,
                                phase,
                                isOpponent,
                                isDisabled,
                                isTargetable,
                                isFpOwner,
                                isAttachment: true,
                            });

                            return (
                                <S.AttachmentWrapper
                                    key={attachment.id}
                                    $index={attachIdx}
                                    data-draggable={
                                        canDragAttachment ? 'true' : undefined
                                    }
                                    onPointerDown={(e) => {
                                        if (
                                            !canDragAttachment ||
                                            e.button !== 0
                                        )
                                            return;
                                        e.stopPropagation();

                                        startDrag(
                                            attachment,
                                            attachIdx,
                                            e,
                                            'ATTACHMENT',
                                            'portrait',
                                            character.instanceId || character.id
                                        );
                                    }}
                                >
                                    <Card
                                        card={attachment}
                                        size="sm"
                                        isDisabled={isDisabled}
                                        isActionable={isActionable}
                                        isDraggable={canDragAttachment}
                                        G={G}
                                    />
                                </S.AttachmentWrapper>
                            );
                        })}
                    </S.AttachmentsContainer>
                )}

                {/* Cartes empilées sur l’hôte (Web, Narsil, Goblin Swarms…) */}
                {stackedCards.length > 0 && (
                    <S.StackedOnCardGrid $count={stackPeeks.length}>
                        {stackPeeks.map((stacked, peekIdx) => {
                            const stackIdx = stackPeekOffset + peekIdx;
                            const stackedKey =
                                stacked.instanceId || stacked.id;
                            const stackedTargetable =
                                isCardTargetable(stackedKey) ||
                                isCardTargetable(stacked.id);
                            const canDirectPlay = Boolean(
                                directStackPlayIds?.has(stackedKey) ||
                                    (stacked.id &&
                                        directStackPlayIds?.has(stacked.id))
                            );
                            /** Drag only (main) — désignation clic = flèche. */
                            const canDragStacked =
                                targetingKind === 'STACK_PLAY' ||
                                canDirectPlay;
                            const stackedHalo =
                                stackedTargetable || canDirectPlay;
                            const hostId =
                                character.instanceId || character.id;
                            return (
                                <S.StackedOnCardSlot
                                    key={stackedKey}
                                    $index={peekIdx}
                                    $targetable={stackedHalo}
                                    $draggable={canDragStacked}
                                    data-cursor={
                                        stackedTargetable && !canDragStacked
                                            ? 'arrow'
                                            : undefined
                                    }
                                    data-interactive={
                                        stackedTargetable && !canDragStacked
                                            ? 'true'
                                            : undefined
                                    }
                                    ref={(el) => {
                                        registerTarget(stackedKey, el);
                                        if (
                                            stacked.id &&
                                            stacked.id !== stackedKey
                                        ) {
                                            registerTarget(stacked.id, el);
                                        }
                                    }}
                                    onPointerDown={(e) => {
                                        if (e.button !== 0) return;
                                        e.stopPropagation();
                                        if (!stackedHalo) return;
                                        if (canDragStacked) {
                                            startDrag(
                                                stacked,
                                                stackIdx,
                                                e,
                                                'CARD_STACK',
                                                'portrait',
                                                hostId
                                            );
                                            return;
                                        }
                                        selectCard(
                                            isCardTargetable(stackedKey)
                                                ? stackedKey
                                                : stacked.id
                                        );
                                    }}
                                >
                                    <Card
                                        card={stacked}
                                        size="sm"
                                        visualOnly
                                        isDraggable={canDragStacked}
                                        isDisabled={isDisabled}
                                        isActionable={stackedHalo}
                                        G={G}
                                        phase={phase}
                                        playerID={playerID}
                                    />
                                </S.StackedOnCardSlot>
                            );
                        })}
                        {stackTruncated && (
                            <S.StackedCountBadge
                                type="button"
                                aria-label={`${stackedCards.length} cartes empilées — ouvrir la grille`}
                                title="Voir toute la pile"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    const hostId =
                                        character.instanceId || character.id;
                                    const designationPickIds = stackedCards
                                        .filter((c) => {
                                            const key = c.instanceId || c.id;
                                            return (
                                                isCardTargetable(key) ||
                                                isCardTargetable(c.id)
                                            );
                                        })
                                        .flatMap(
                                            (c) =>
                                                [c.instanceId, c.id].filter(
                                                    Boolean
                                                ) as string[]
                                        );
                                    const pickIds =
                                        designationPickIds.length > 0
                                            ? designationPickIds
                                            : directStackPlay
                                              ? directStackPlay.candidates.flatMap(
                                                    (c) =>
                                                        [
                                                            c.instanceId,
                                                            c.id,
                                                        ].filter(
                                                            Boolean
                                                        ) as string[]
                                                )
                                              : undefined;
                                    const isPick = Boolean(pickIds?.length);
                                    window.dispatchEvent(
                                        new CustomEvent(
                                            'open-stack-overlay',
                                            {
                                                detail: {
                                                    title: `Empilé sur ${character.title || character.i18n?.fr?.title || 'cette carte'}`,
                                                    subtitle: isPick
                                                        ? `${stackedCards.length} carte${stackedCards.length > 1 ? 's' : ''} · choisissez une carte`
                                                        : undefined,
                                                    cards: [
                                                        ...stackedCards,
                                                    ].reverse(),
                                                    selectableCardIds:
                                                        pickIds,
                                                    onSelectCard: isPick
                                                        ? (cardId: string) => {
                                                              if (
                                                                  targetingKind ===
                                                                      'STACK_PLAY' ||
                                                                  targetingKind ===
                                                                      'DESIGNATION' ||
                                                                  designationPickIds.length >
                                                                      0
                                                              ) {
                                                                  selectCard(
                                                                      cardId
                                                                  );
                                                                  return;
                                                              }
                                                              if (
                                                                  directStackPlay
                                                              ) {
                                                                  onActivateAbility?.(
                                                                      hostId,
                                                                      directStackPlay
                                                                          .ability
                                                                          .id,
                                                                      cardId
                                                                  );
                                                              }
                                                          }
                                                        : undefined,
                                                },
                                            }
                                        )
                                    );
                                }}
                            >
                                ×{stackedCards.length}
                            </S.StackedCountBadge>
                        )}
                    </S.StackedOnCardGrid>
                )}
            </S.CharacterStack>
        </S.SkirmishGroup>
    );
};
