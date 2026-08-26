import React from 'react';
import type { CardState, CardType, GameState } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { useTargeting } from '../../../../contexts/TargetingContext';
import { canPlayCard } from '../../../../game/engine/canPlayCard';
import { SkirmishClash } from './SkirmishClash';
import { getEffectiveVitality } from '../../../../utils/cardStats';

interface BoardCharacterStackProps {
    character: CardState;
    index: number;
    isOpponent?: boolean;
    currentSiteIndex?: number;
    onStartDrag?: (e: React.PointerEvent) => void;
    isAssignmentPhase?: boolean;
    isSkirmishPhase?: boolean;
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
}

export const BoardCharacterStack: React.FC<BoardCharacterStackProps> = ({
    character,
    G,
    playerID,
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
    isWounded = false,
    isDead = false,
    isDisabled = false,
    burdens = 0,
    isFaceDown = false,
}) => {
    const { registerTarget, activeTargetId, dragged, startDrag } = useDrag();
    const { isCardTargetable, selectCard } = useTargeting();

    // 🎯 Vérifie si le personnage principal est une cible valide pour l'action en cours
    const isTargetable = isCardTargetable(character.id);

    // 🟢 Extraction distincte du TYPE et du SUBTYPE
    const draggedType = (dragged?.card as CardState)?.type as
        | CardType
        | undefined;

    const isBeingDragged = dragged?.card?.id === character.id;

    // ⛔ Si la carte est ciblable ou désactivée, ON BLOQUE LE DRAG
    const canDragCharacter =
        !isDisabled &&
        !isTargetable &&
        (!isOpponent || (isAssignmentPhase && character.type === 'MINION'));

    const isMinionAssignment =
        dragged?.origin === 'BATTLEFIELD' && draggedType === 'MINION';

    // On récupère la carte complète en cours de drag
    const draggedCard = dragged?.card as CardState | undefined;

    // Validation d'attachement via la fonction DNF
    const canAttach = draggedCard
        ? canPlayCard(
              draggedCard,
              { G, ctx: {} as any, playerID },
              character.id,
              character,
              { ignorePhase: true }
          ).valid
        : false;

    const isTargeted =
        activeTargetId === character.id &&
        ((!isOpponent && canAttach) || isMinionAssignment);

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
            $isSkirmishPhase={isSkirmishPhase && assignedMinions.length > 0}
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
                            const isMinionTargetable = isCardTargetable(
                                minion.id
                            );

                            // Conversion stricte en boolean pour éviter l'erreur TypeScript
                            const isMinionWounded = Boolean(
                                minion.wounds && minion.wounds > 0
                            );
                            const isMinionDead =
                                getEffectiveVitality(minion) <= 0;

                            return (
                                <S.MinionWrapper
                                    key={minion.instanceId || minion.id}
                                    $isTargetable={isMinionTargetable}
                                    onClick={(e) => {
                                        if (isMinionTargetable) {
                                            e.stopPropagation();
                                            selectCard(minion.id);
                                        }
                                    }}
                                >
                                    <Card
                                        card={minion}
                                        size="sm"
                                        isDraggable={false}
                                        isWounded={isMinionWounded}
                                        isDead={isMinionDead}
                                        isDisabled={isDisabled}
                                        isOpponent={!isOpponent}
                                    />
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
                    $isDead={isDead}
                    $isDisabled={isDisabled}
                    data-card={JSON.stringify(character)}
                    data-draggable={canDragCharacter ? 'true' : undefined}
                    ref={(el) => registerTarget(character.id, el)}
                    onPointerDown={(e) => {
                        // 🎯 Si c'est ciblable, on déclenche directement la sélection au clic
                        if (isTargetable) {
                            e.stopPropagation();
                            selectCard(character.id);
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
                        index={index}
                        currentSiteIndex={currentSiteIndex}
                        isWounded={isWounded}
                        isDead={isDead}
                        isDisabled={isDisabled}
                        isOpponent={isOpponent}
                        burdens={burdens}
                        isFaceDown={isFaceDown}
                    />
                </S.CardDragTarget>

                {/* ATTACHEMENTS CLASSIQUES */}
                {character.attachments && character.attachments.length > 0 && (
                    <S.AttachmentsContainer className="attachments-group">
                        {character.attachments.map((attachment, attachIdx) => (
                            <S.AttachmentWrapper
                                key={attachment.id}
                                $index={attachIdx}
                                data-draggable={
                                    !isOpponent && !isTargetable && !isDisabled
                                        ? 'true'
                                        : undefined
                                }
                                onPointerDown={(e) => {
                                    if (
                                        isOpponent ||
                                        isTargetable ||
                                        isDisabled ||
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
                                    isDraggable={
                                        !isOpponent &&
                                        !isTargetable &&
                                        !isDisabled
                                    }
                                />
                            </S.AttachmentWrapper>
                        ))}
                    </S.AttachmentsContainer>
                )}
            </S.CharacterStack>
        </S.SkirmishGroup>
    );
};
