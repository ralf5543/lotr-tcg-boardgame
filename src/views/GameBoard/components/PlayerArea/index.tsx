import React from 'react';
import type { CardType } from '../../../../game/types';
import * as S from './styles';
import { Card } from '../Card';

interface PlayerAreaProps {
    playerId: string;
    deckCount: number;
    freePeoplesArea: CardType[];
    supportArea: CardType[];
    isOpponent?: boolean;
}

export const PlayerArea: React.FC<PlayerAreaProps> = ({
    playerId,
    deckCount,
    freePeoplesArea,
    supportArea,
    isOpponent = false,
}) => {
    return (
        <S.AreaContainer $isOpponent={isOpponent}>
            <S.MetaInfo $isOpponent={isOpponent}>
                {isOpponent
                    ? `🔴 ADVERSAIRE (Joueur ${playerId}) — Deck : ${deckCount} cartes`
                    : `🧙‍♂️ TOI (Joueur ${playerId})`}
            </S.MetaInfo>

            {/* 1. ZONE PEUPLE LIBRE (Conditionnelle pour l'adversaire) */}
            {isOpponent ? (
                <S.MaskedZonePlaceholder>
                    🔒 Zone Peuple Libre masquée pendant le tour de l'Ombre
                </S.MaskedZonePlaceholder>
            ) : (
                <S.Zone $borderColor="#3498db">
                    <S.ZoneTitle color="#3498db">
                        🛡️ Ligne de Front (Compagnons)
                    </S.ZoneTitle>
                    <S.CardRow>
                        {(freePeoplesArea || []).length === 0 && (
                            <S.EmptyText>Aucun compagnon déployé.</S.EmptyText>
                        )}
                        {(freePeoplesArea || []).map((card) => (
                            <Card key={card.id} card={card} />
                        ))}
                    </S.CardRow>
                </S.Zone>
            )}

            {/* 2. AIRE DE SOUTIEN (Toujours visible pour les deux) */}
            <S.Zone $borderColor="#f39c12">
                <S.ZoneTitle color="#f39c12">
                    🎒 Aire de Soutien (Support Area)
                </S.ZoneTitle>
                <S.CardRow>
                    {(supportArea || []).length === 0 && (
                        <S.EmptyText>Aire de soutien vide.</S.EmptyText>
                    )}
                    {(supportArea || []).map((card) => (
                        <S.GameCard key={card.id} $borderColor="#f39c12">
                            <S.CardTitle>{card.title}</S.CardTitle>
                        </S.GameCard>
                    ))}
                </S.CardRow>
            </S.Zone>
        </S.AreaContainer>
    );
};
