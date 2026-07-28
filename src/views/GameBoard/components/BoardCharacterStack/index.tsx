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
}

export const BoardCharacterStack: React.FC<BoardCharacterStackProps> = ({
    character,
    index,
    isOpponent = false,
    currentSiteIndex,
    onStartDrag,
}) => {
    const { registerTarget, activeTargetId, dragged, startDrag } = useDrag();

    const draggedSubtype = (dragged?.card as CardState)?.type as
        | CardType
        | undefined;
    const isBeingDragged = dragged?.card?.id === character.id;

    // Survol valide pour attachement (Possession, Arme, Condition, etc.)
    const isTargeted =
        !isOpponent &&
        activeTargetId === character.id &&
        canAttachToCharacter(draggedSubtype);

    return (
        <S.CharacterStack $isBeingDragged={isBeingDragged}>
            <S.CardDragTarget
                $isOpponent={isOpponent}
                $isTargeted={isTargeted}
                data-draggable={!isOpponent ? 'true' : undefined}
                ref={(el) => !isOpponent && registerTarget(character.id, el)}
                onPointerDown={onStartDrag}
            >
                <Card
                    card={character}
                    size="sm"
                    isDraggable={!isOpponent}
                    index={index}
                    currentSiteIndex={currentSiteIndex}
                />
            </S.CardDragTarget>

            {character.attachments && character.attachments.length > 0 && (
                <S.AttachmentsContainer>
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

                                    // 🟢 Appel propre avec l'objet de configuration du DragContext
                                    startDrag(
                                        attachment, // 1. card
                                        attachIdx, // 2. index
                                        e, // 3. event
                                        'ATTACHMENT', // 4. origin (optionnel)
                                        'portrait', // 5. orientation (optionnel)
                                        character.id // 6. parentId / host character ID (si ta méthode le supporte)
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
    );
};
