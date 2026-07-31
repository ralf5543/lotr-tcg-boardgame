import React from 'react';
import type { CardState, CardType } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { canAttachToCharacter } from '../../../../utils/routingDragNDrop';

interface BoardCharacterStackProps {
    character: CardState;
    index: number;
    isOpponent?: boolean;
    currentSiteIndex?: number;
    onStartDrag?: (e: React.PointerEvent) => void;
    isAssignmentPhase?: boolean;
    isSkirmishPhase?: boolean;
    skirmishId?: string; // 🟢 ID du couple / combat
    assignedMinions?: CardState[];
    onSelectSkirmish?: (skirmishId: string) => void; // 🟢 Callback pour sélectionner ce combat
    isSelectedSkirmish?: boolean;
    isSelectionAllowed?: boolean;
    lastWoundedCardIds?: string[]
}

export const BoardCharacterStack: React.FC<BoardCharacterStackProps> = ({
    character,
    index,
    isOpponent = false,
    currentSiteIndex,
    onStartDrag,
    isAssignmentPhase = false,
    isSkirmishPhase = false,
    skirmishId,
    assignedMinions = [],
    onSelectSkirmish,
    isSelectedSkirmish = false,
    isSelectionAllowed = true,
    lastWoundedCardIds = [],
}) => {
    const { registerTarget, activeTargetId, dragged, startDrag } = useDrag();

    const draggedSubtype = (dragged?.card as CardState)?.type as
        | CardType
        | undefined;
    const isBeingDragged = dragged?.card?.id === character.id;

    const canDragCharacter =
        !isOpponent || (isAssignmentPhase && character.type === 'MINION');

    const isMinionAssignment =
        dragged?.origin === 'BATTLEFIELD' && draggedSubtype === 'MINION';

    const isTargeted =
    activeTargetId === character.id &&
    ((!isOpponent && canAttachToCharacter(draggedSubtype)) || isMinionAssignment);

    // Règle de sélection : Uniquement en phase skirmish, avec un ID, si des minions sont assignés et si la sélection est permise
    const canSelectThisSkirmish =
        isSkirmishPhase &&
        Boolean(skirmishId) &&
        assignedMinions.length > 0 &&
        isSelectionAllowed;

    const handleStackClick = (e: React.MouseEvent) => {
        // 1. On stoppe immédiatement la propagation pour que le DragContext
        // ou le parent ne déclenche pas un faux "Drop"
        e.stopPropagation();

        console.log('1. [CLICK] Clic intercepté sur BoardCharacterStack !', {
            isSkirmishPhase,
            skirmishId,
            hasOnSelectSkirmish: Boolean(onSelectSkirmish),
            assignedMinionsCount: assignedMinions.length,
        });

        // 2. On vérifie les conditions pour déclencher le combat
        if (isSkirmishPhase && skirmishId && onSelectSkirmish) {
            console.log(
                '2. [CLICK] Condition OK -> Appel de onSelectSkirmish pour',
                skirmishId
            );
            onSelectSkirmish(skirmishId);
        } else {
            console.warn(
                '⚠️ [CLICK] Clic ignoré car les conditions ne sont pas réunies.',
                {
                    reason: !isSkirmishPhase
                        ? "Ce n'est pas la phase de Skirmish"
                        : !skirmishId
                          ? 'skirmishId est manquant'
                          : 'onSelectSkirmish est manquant',
                }
            );
        }
    };

    return (
        <S.SkirmishGroup
            $isSkirmishPhase={isSkirmishPhase && assignedMinions.length > 0}
            $isSelected={isSelectedSkirmish}
            $isOpponent={isOpponent}
            $isSelectable={canSelectThisSkirmish}
            onClick={handleStackClick}
        >
            <S.CharacterStack $isBeingDragged={isBeingDragged}>
                {/* 🟢 SÉIDES ASSIGNÉS (Affichés dans leur propre conteneur distinct des possessions) */}
                {assignedMinions.length > 0 && (
                    <S.AssignedMinionsContainer
                        $isOpponent={isOpponent}
                        className="assigned-minions-group"
                    >
                        {assignedMinions.map((minion, mIdx) => (
                            <S.MinionWrapper key={minion.id} $index={mIdx}>
                                <Card
                                    card={minion}
                                    size="sm"
                                    isDraggable={false}
                                    isWounded={lastWoundedCardIds.includes(minion.id)}
                                />
                            </S.MinionWrapper>
                        ))}
                    </S.AssignedMinionsContainer>
                )}

                {/* CARTE PRINCIPALE (Compagnon ou Séide solo) */}
                <S.CardDragTarget
                    $isOpponent={isOpponent}
                    $isTargeted={isTargeted}
                    data-draggable={canDragCharacter ? 'true' : undefined}
                    ref={(el) => registerTarget(character.id, el)}
                    onPointerDown={(e) => {
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
                    <Card
                        card={character}
                        size="sm"
                        isDraggable={canDragCharacter}
                        index={index}
                        currentSiteIndex={currentSiteIndex}
                        isWounded={lastWoundedCardIds.includes(character.id)}
                    />
                </S.CardDragTarget>

                {/* ATTACHEMENTS CLASSIQUES (Possessions, Objets sous la carte) */}
                {character.attachments && character.attachments.length > 0 && (
                    <S.AttachmentsContainer className="attachments-group">
                        {character.attachments.map((attachment, attachIdx) => {
                            const isAttachmentBeingDragged =
                                dragged?.card?.id === attachment.id;

                            return (
                                <S.AttachmentWrapper
                                    key={attachment.id}
                                    $index={attachIdx}
                                    $isBeingDragged={isAttachmentBeingDragged}
                                    data-draggable={
                                        !isOpponent ? 'true' : undefined
                                    }
                                    onPointerDown={(e) => {
                                        if (isOpponent || e.button !== 0)
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
                                        isDraggable={!isOpponent}
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
