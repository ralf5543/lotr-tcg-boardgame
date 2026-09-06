import React from 'react';
import type { CardState, CardType, GameState } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useTargeting } from '../../../../contexts/TargetingContext';
import { canPlayCard } from '../../../../game/engine/canPlayCard';
import { SkirmishClash } from './SkirmishClash';
import { getEffectiveVitality } from '../../../../utils/cardStats';
import { canTransferAid } from '../../../../game/engine/validations/canTransferAid';
import { isInPlayCardDraggable } from './isInPlayCardDraggable';

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
    onActivateAbility?: (sourceInstanceId: string, abilityId: string) => void;
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
    const { registerTarget, activeTargetId, dragged, startDrag, isOverHandCancel } =
        useDrag();
    const { isCardTargetable, selectCard, targetingKind } = useTargeting();

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
        (isTargetable && targetingKind === 'DESIGNATION') ||
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
        isOpponent,
        isDisabled,
        isTargetable,
        isFpOwner,
    });

    const isMinionAssignment =
        dragged?.origin === 'BATTLEFIELD' && draggedType === 'MINION';

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
        } else if (draggedCard.type === 'FOLLOWER') {
            canAttach = canTransferAid(
                draggedCard,
                character,
                G,
                playerID
            ).valid;
        }
    }

    // 🎯 Matching avec instanceId prioritaire, sinon id
    const currentId = character.instanceId || character.id;
    const isAimedByArrow =
        isDragDesignating &&
        (activeTargetId === currentId || activeTargetId === character.id);
    const isTargeted =
        ((activeTargetId === currentId || activeTargetId === character.id) &&
            ((!isOpponent && canAttach) || isMinionAssignment)) ||
        isAimedByArrow;

    // Règle de sélection d'escarmouche
    const canSelectThisSkirmish =
        isSkirmishPhase &&
        Boolean(skirmishId) &&
        assignedMinions.length > 0 &&
        isSelectionAllowed;

    const handleStackClick = (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!canSelectThisSkirmish || isSelectedSkirmish) return;

        if (isSkirmishPhase && skirmishId && onSelectSkirmish) {
            onSelectSkirmish(skirmishId);
        }
    };

    return (
        <S.SkirmishGroup
            $isSelected={isSelectedSkirmish}
            $isOpponent={isOpponent}
            $isSelectable={canSelectThisSkirmish}
            onClick={handleStackClick}
        >
            {isSelectedSkirmish && <SkirmishClash $isOpponent={isOpponent} />}
            <S.CharacterStack $isBeingDragged={isBeingDragged}>
                {/* 🟢 SÉIDES ASSIGNÉS */}
                {assignedMinions.length > 0 && (
                    <S.AssignedMinionsContainer
                        $isOpponent={isOpponent}
                        className="assigned-minions-group"
                    >
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

                            return (
                                <S.MinionWrapper
                                    key={minion.instanceId || minion.id}
                                    $isTargetable={isMinionTargetable}
                                    $isDesignationTarget={
                                        isMinionDesignationTarget
                                    }
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
                    </S.AssignedMinionsContainer>
                )}

                {/* CARTE PRINCIPALE (Compagnon ou Séide solo) */}
                <S.CardDragTarget
                    $isOpponent={isOpponent}
                    $isTargeted={isTargeted}
                    $isTargetable={isTargetable}
                    $isDesignationTarget={isDesignationTarget}
                    $suppressHoverScale={isInCombat}
                    $isDead={isDead}
                    $isDisabled={isDisabled}
                    data-card={JSON.stringify(character)}
                    data-draggable={canDragCharacter ? 'true' : undefined}
                    ref={(el) =>
                        registerTarget(character.instanceId || character.id, el)
                    }
                    onPointerDown={(e) => {
                        // 🎯 Si c'est ciblable, on déclenche directement la sélection au clic
                        if (isTargetable) {
                            e.stopPropagation();
                            selectCard(cardKey);
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
                                            character.id
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
            </S.CharacterStack>
        </S.SkirmishGroup>
    );
};
