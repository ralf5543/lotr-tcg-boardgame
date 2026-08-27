/* todo : remove this file if useless */
/*import React from 'react';
import type { GameState } from '../../../../game/types';
import * as S from './styles';
import { Card } from '../Card';

interface AssignedMinionsProps {
    companionId: string;
    G: GameState;
}

export const AssignedMinions: React.FC<AssignedMinionsProps> = ({
    companionId,
    G,
}) => {
    // 1. Récupérer l'escarmouche liée à ce compagnon
    const skirmish = G.skirmishes?.find((s) => s.companionId === companionId);
    if (!skirmish || skirmish.minionIds.length === 0) return null;

    // 2. Récupérer les cartes complètes des séides affectés
    const assignedMinions = G.battlefield.filter((card) =>
        skirmish.minionIds.includes(card.id)
    );

    return (
        <S.MinionStackOverlay>
            {assignedMinions.map((minionCard, index) => (
                <S.StackedMinionCard key={minionCard.id} $index={index}>
                    <Card
                        card={minionCard}
                        isWounded={(minionCard.wounds || 0) > 0}
                        G={G}
                    />
                </S.StackedMinionCard>
            ))}
        </S.MinionStackOverlay>
    );
};*/
