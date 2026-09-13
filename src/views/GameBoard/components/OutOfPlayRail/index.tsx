import React from 'react';
import { TwilightPool } from '../TwilightPool';
import * as S from './styles';

interface OutOfPlayRailProps {
    twilight: number;
    /** Cimetière FP : on y pose les menaces (maquette). */
    fpIsOpponent: boolean;
}

const MockPile: React.FC<{
    variant: 'discard' | 'cemetery';
    owner: 'adverse' | 'toi';
    showThreats?: boolean;
}> = ({ variant, owner, showThreats }) => (
    <S.PileBlock $variant={variant}>
        {showThreats && (
            <S.ThreatDots>
                {Array.from({ length: 3 }).map((_, i) => (
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
            {showThreats ? '\n3 menaces' : ''}
        </S.PileLabel>
    </S.PileBlock>
);

export const OutOfPlayRail: React.FC<OutOfPlayRailProps> = ({
    twilight,
    fpIsOpponent,
}) => {
    return (
        <S.Rail>
            <S.RailTitle>Maquette · hors-jeu</S.RailTitle>
            <S.PileRow>
                <MockPile variant="discard" owner="adverse" />
                <MockPile
                    variant="cemetery"
                    owner="adverse"
                    showThreats={fpIsOpponent}
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
                    showThreats={!fpIsOpponent}
                />
            </S.PileRow>
            <S.ChatSlot>Journal / chat (plus tard)</S.ChatSlot>
        </S.Rail>
    );
};
