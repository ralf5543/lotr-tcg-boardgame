import React, { useEffect, useState } from 'react';
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

export const TwilightPool: React.FC<TwilightPoolProps> = ({ value }) => {
    const [tokens, setTokens] = useState<PhysicalToken[]>([]);

    useEffect(() => {
        setTokens((prevTokens) => {
            const currentCount = prevTokens.length;

            // CAS A : On doit ajouter des pions
            if (value > currentCount) {
                const newTokens = [...prevTokens];
                const toAdd = value - currentCount;

                for (let i = 0; i < toAdd; i++) {
                    newTokens.push({
                        // ID basé sur un timestamp + index pour éviter tout conflit
                        id: `twilight-${Date.now()}-${Math.random()}`,
                        // On garde une marge de sécurité (ex: 5% à 85%) pour ne pas déborder du cadre
                        left: Math.floor(Math.random() * 80) + 5,
                        top: Math.floor(Math.random() * 60) + 15,
                        rotate: Math.floor(Math.random() * 360),
                    });
                }
                return newTokens;
            }

            // CAS B : On dépense des pions (on retire les derniers arrivés)
            if (value < currentCount) {
                return prevTokens.slice(0, value);
            }

            return prevTokens;
        });
    }, [value]);

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
                        src="/interface/twilight_token.webp"
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
