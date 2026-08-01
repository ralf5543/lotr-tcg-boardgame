import React, { useEffect, useRef } from 'react';
import type { CardState, SiteCardState } from '../../../../game/types';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { BoardCharacterStack } from '../BoardCharacterStack';

// Helper pour déterminer si une carte est une carte standard (CardState)
const isStandardCard = (
    card: CardState | SiteCardState
): card is CardState => {
    return 'kind' in card && 'type' in card;
};

interface BattlefieldProps {
    cards: CardState[];
    playerRole?: '0' | '1';
    currentSiteIndex?: number;
    isAssignmentPhase?: boolean;
    skirmishes?: Array<{ companionId?: string; minionIds?: string[] }>;
    lastWoundedCardIds?: string[];
    isOpponent?: boolean;
}

export const Battlefield: React.FC<BattlefieldProps> = ({
    cards,
    currentSiteIndex,
    isAssignmentPhase = false,
    skirmishes = [],
    lastWoundedCardIds = [],
    isOpponent = false,
}) => {
    const { registerTarget, activeTargetId, dragged } = useDrag();
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        registerTarget('battlefield', containerRef.current);
        return () => {
            registerTarget('battlefield', null);
        };
    }, [registerTarget]);

    // Validation type-safe : on vérifie d'abord que c'est une carte standard
    const isValidCard =
        !!dragged?.card &&
        isStandardCard(dragged.card) &&
        dragged.card.type === 'MINION' &&
        dragged.card.kind === 'SHADOW';

    const isHovered = activeTargetId === 'battlefield' && isValidCard;

    // Filtrer les séides non assignés
    const unassignedMinions = cards.filter(
        (minion) => !skirmishes.some((s) => s.minionIds?.includes(minion.id))
    );

    return (
        <S.Battlefield ref={containerRef} $isHovered={isHovered}>
            <S.CardRow>
                {unassignedMinions.length === 0 && (
                    <S.InfoText>
                        {isHovered
                            ? 'Déposez le serviteur ici !'
                            : 'Le champ de bataille est vide...'}
                    </S.InfoText>
                )}
                {unassignedMinions.map((minion, idx) => (
                    <BoardCharacterStack
                        key={minion.id}
                        character={minion}
                        index={idx}
                        isOpponent={isOpponent}
                        currentSiteIndex={currentSiteIndex}
                        isAssignmentPhase={isAssignmentPhase}
                        lastWoundedCardIds={lastWoundedCardIds}
                    />
                ))}
            </S.CardRow>
        </S.Battlefield>
    );
};