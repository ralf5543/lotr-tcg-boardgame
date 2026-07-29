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
        !isOpponent &&
        activeTargetId === character.id &&
        (canAttachToCharacter(draggedSubtype) || isMinionAssignment);

    const handleStackClick = () => {
        if (isSkirmishPhase && skirmishId && onSelectSkirmish) {
            onSelectSkirmish(skirmishId);
        }
    };

    return (
        <S.SkirmishGroup
            $isSkirmishPhase={isSkirmishPhase && assignedMinions.length > 0}
            $isSelected={isSelectedSkirmish}
            onClick={handleStackClick}
        >
            <S.CharacterStack $isBeingDragged={isBeingDragged}>
                {/* 🟢 SÉIDES ASSIGNÉS (Affichés dans leur propre conteneur distinct des possessions) */}
                {assignedMinions.length > 0 && (
                    <S.AssignedMinionsContainer $isOpponent={isOpponent} className="assigned-minions-group">
                        {assignedMinions.map((minion, mIdx) => (
                            <S.MinionWrapper key={minion.id} $index={mIdx}>
                                <Card
                                    card={minion}
                                    size="sm"
                                    isDraggable={false}
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
                                        if (isOpponent || e.button !== 0) return;
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