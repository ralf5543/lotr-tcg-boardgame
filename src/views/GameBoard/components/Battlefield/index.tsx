import React from 'react';
import type { CardType } from '../../../../game/types';
import { Card } from '../Card';
import * as S from './styles';

interface BattlefieldProps {
    cards: CardType[];
}

export const Battlefield: React.FC<BattlefieldProps> = ({ cards }) => {
    return (
        <S.Container>
            <S.Title>⚔️ BATTLEFIELD (Séides en bazar)</S.Title>

            <S.CardRow>
                {cards.length === 0 && (
                    <S.InfoText>Le champ de bataille est vide...</S.InfoText>
                )}
                {cards.map((card) => (
                    <Card key={card.id} card={card} />
                ))}
            </S.CardRow>

            <S.TokenReserve>
                <strong style={{ color: '#f1c40f' }}>
                    🪙 Réserve de Jetons
                </strong>
                <S.TokenGrid>
                    <S.TokenPile color="#c0392b" title="Blessure">
                        🩸 Blessures
                    </S.TokenPile>
                    <S.TokenPile color="#9b59b6" title="Fardeau">
                        🌋 Fardeaux
                    </S.TokenPile>
                </S.TokenGrid>
            </S.TokenReserve>
        </S.Container>
    );
};
