import React, { useState } from 'react';
import * as S from './styles';

interface TwilightPoolProps {
    value: number; // Reçu depuis G.twilightPool
}

interface PhysicalToken {
    id: string;
    left: number; // Position X aléatoire (%)
    top: number; // Position Y aléatoire (%)
    rotate: number; // Angle aléatoire (degrés)
}

const generateToken = (): PhysicalToken => ({
    id: `twilight-${Date.now()}-${Math.random()}`,
    left: Math.floor(Math.random() * 80) + 5,
    top: Math.floor(Math.random() * 60) + 15,
    rotate: Math.floor(Math.random() * 360),
});

export const TwilightPool: React.FC<TwilightPoolProps> = ({ value }) => {
    // 🟢 On gère à la fois les tokens et la valeur précédente dans le state
    const [{ tokens, prevValue }, setTokensState] = useState<{
        tokens: PhysicalToken[];
        prevValue: number;
    }>({
        tokens: [],
        prevValue: 0,
    });

    // 🟢 Si la prop "value" a changé pendant le rendu, on ajuste les tokens synchroniquement
    if (value !== prevValue) {
        let newTokens = tokens;

        if (value > tokens.length) {
            const toAdd = value - tokens.length;
            const addedTokens = Array.from({ length: toAdd }, generateToken);
            newTokens = [...tokens, ...addedTokens];
        } else if (value < tokens.length) {
            newTokens = tokens.slice(0, value);
        }

        setTokensState({
            tokens: newTokens,
            prevValue: value,
        });
    }

    return (
        <S.PoolContainer>
            <S.PoolHeader>
                🔮 RÉSERVE CRÉPUSCULAIRE
                <S.CounterBadge>{value}</S.CounterBadge>
            </S.PoolHeader>

            <S.BowlArea>
                {/* Nos pions physiques éparpillés */}
                {tokens.map((token) => (
                    <S.TwilightToken
                        key={token.id}
                        $left={token.left}
                        $top={token.top}
                        $rotate={token.rotate}
                        src="/interface/tokens/twilight_token.webp"
                        alt=""
                    />
                ))}

                {/* Petit texte d'ambiance si la coupelle est vide */}
                {value === 0 && (
                    <S.EmptyText>
                        La nuit n'est pas encore tombée...
                    </S.EmptyText>
                )}
            </S.BowlArea>
        </S.PoolContainer>
    );
};