import React from 'react';
import type { CardState } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';

interface BattlefieldProps {
    cards: CardState[];
}

export const Battlefield: React.FC<BattlefieldProps> = ({ cards }) => {
    return (
        <S.Container>
            <S.CardRow>
                {cards.length === 0 && (
                    <S.InfoText>Le champ de bataille est vide...</S.InfoText>
                )}
                {cards.map((card) => (
                    <Card key={card.id} card={card} />
                ))}
            </S.CardRow>

            
        </S.Container>
    );
};
