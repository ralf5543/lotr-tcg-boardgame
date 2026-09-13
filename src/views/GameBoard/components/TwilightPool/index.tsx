import React, { useState } from 'react';
import * as S from './styles';

interface TwilightPoolProps {
    value: number;
}

interface PhysicalToken {
    id: string;
    left: number;
    top: number;
    rotate: number;
}

const generateToken = (): PhysicalToken => ({
    id: `twilight-${Date.now()}-${Math.random()}`,
    left: Math.floor(Math.random() * 72) + 14,
    top: Math.floor(Math.random() * 58) + 28,
    rotate: Math.floor(Math.random() * 360),
});

export const TwilightPool: React.FC<TwilightPoolProps> = ({ value }) => {
    const [{ tokens, prevValue }, setTokensState] = useState<{
        tokens: PhysicalToken[];
        prevValue: number;
    }>({
        tokens: [],
        prevValue: 0,
    });

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
            <S.CompactLabel>Crépuscule</S.CompactLabel>
            <S.CounterBadge>{value}</S.CounterBadge>
            <S.BowlArea>
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
            </S.BowlArea>
        </S.PoolContainer>
    );
};
