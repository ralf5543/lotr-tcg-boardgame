import React, { useEffect, useRef } from 'react';
import type { CardState } from '../../../../game/types';
import * as S from './styles';
import { useDrag } from '../../../../contexts/DragContext';
import { BoardCharacterStack } from '../BoardCharacterStack';

interface BattlefieldProps {
    cards: CardState[];
    playerRole?: '0' | '1';
    currentSiteIndex?: number;
    isAssignmentPhase?: boolean;
    skirmishes?: Array<{ companionId?: string; minionIds?: string[] }>;
}

export const Battlefield: React.FC<BattlefieldProps> = ({
    cards,
    playerRole,
    currentSiteIndex,
    isAssignmentPhase = false,
    skirmishes = [],
}) => {
    const { registerTarget, activeTargetId, dragged } = useDrag();
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        registerTarget('battlefield', containerRef.current);
        return () => {
            registerTarget('battlefield', null);
        };
    }, [registerTarget]);

    const isValidCard = dragged?.card?.type === 'MINION' && dragged?.card?.kind === 'SHADOW';
    const isHovered = activeTargetId === 'battlefield' && isValidCard;

    const isOpponent = playerRole === '0';

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
                    />
                ))}
            </S.CardRow>
        </S.Battlefield>
    );
};