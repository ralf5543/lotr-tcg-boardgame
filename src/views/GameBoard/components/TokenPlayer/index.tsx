import React from 'react';
import * as S from './styles';

interface TokenPlayerProps {
    value: string;        // '0' ou '1' pour le style $value
    avatarUrl?: string;   // Image optionnelle
    playerName?: string;  // Nom pour le alt
}

export const TokenPlayer: React.FC<TokenPlayerProps> = ({
    value,
    avatarUrl,
    playerName,
}) => {
    return (
        <S.Token $value={value}>
            <S.Avatar
                src={avatarUrl}
                alt={playerName || `Joueur ${value}`}
            />
        </S.Token>
    );
};