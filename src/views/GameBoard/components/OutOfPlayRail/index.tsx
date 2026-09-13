import React from 'react';
import { TwilightPool } from '../TwilightPool';
import * as S from './styles';

interface OutOfPlayRailProps {
    twilight: number;
    fpIsOpponent: boolean;
    threats: number;
    threatLimit: number;
}

const threatLabel = (count: number): string =>
    count <= 0 ? '' : count === 1 ? '1 menace' : `${count} menaces`;

const MockPile: React.FC<{
    variant: 'discard' | 'cemetery';
    owner: 'adverse' | 'toi';
    threats?: number;
    threatLimit?: number;
}> = ({ variant, owner, threats = 0, threatLimit = 0 }) => {
    const showThreats = variant === 'cemetery' && threats > 0;
    const caption = threatLabel(threats);

    return (
        <S.PileBlock $variant={variant}>
            {showThreats && (
                <S.ThreatDots
                    aria-label={
                        threatLimit > 0
                            ? `${caption} (limite ${threatLimit})`
                            : caption
                    }
                    title={
                        threatLimit > 0
                            ? `${caption} · limite ${threatLimit} compagnons`
                            : caption
                    }
                >
                    {Array.from({ length: threats }).map((_, i) => (
                        <S.ThreatDot
                            key={i}
                            src="interface/tokens/token_blood.webp"
                            alt=""
                        />
                    ))}
                </S.ThreatDots>
            )}
            <S.PileLabel>
                {owner === 'adverse' ? 'Adv. ' : ''}
                {variant === 'cemetery' ? 'Cimetière' : 'Défausse'}
                {showThreats ? `\n${caption}` : ''}
            </S.PileLabel>
        </S.PileBlock>
    );
};

export const OutOfPlayRail: React.FC<OutOfPlayRailProps> = ({
    twilight,
    fpIsOpponent,
    threats,
    threatLimit,
}) => {
    return (
        <S.Rail>
            <S.PileRow>
                <MockPile variant="discard" owner="adverse" />
                <MockPile
                    variant="cemetery"
                    owner="adverse"
                    threats={fpIsOpponent ? threats : 0}
                    threatLimit={threatLimit}
                />
            </S.PileRow>
            <S.TwilightSlot>
                <TwilightPool value={twilight} />
            </S.TwilightSlot>
            <S.PileRow>
                <MockPile variant="discard" owner="toi" />
                <MockPile
                    variant="cemetery"
                    owner="toi"
                    threats={fpIsOpponent ? 0 : threats}
                    threatLimit={threatLimit}
                />
            </S.PileRow>
            <S.ChatSlot>Journal / chat (plus tard)</S.ChatSlot>
        </S.Rail>
    );
};
