import React from 'react';
import type { CardType } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';
import { TwilightPool } from '../TwilightPool';

interface BattlefieldProps {
    cards: CardType[];
    twilightPoolValue: number;
}

export const Battlefield: React.FC<BattlefieldProps> = ({ cards, twilightPoolValue }) => {
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

            <TwilightPool value={twilightPoolValue} />
        </S.Container>
    );
};
