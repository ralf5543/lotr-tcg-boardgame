import React from 'react';
import type { CardState } from '../../../../game/types';
import { TwilightPool } from '../TwilightPool';
import * as S from './styles';

export type OutOfPlayZoneKey =
    | 'opponent-discard'
    | 'opponent-cemetery'
    | 'my-discard'
    | 'my-cemetery';

interface OutOfPlayRailProps {
    twilight: number;
    fpIsOpponent: boolean;
    threats: number;
    threatLimit: number;
    myDiscard: CardState[];
    myDeadPile: CardState[];
    opponentDiscard: CardState[];
    opponentDeadPile: CardState[];
    onOpenZone: (zone: OutOfPlayZoneKey) => void;
}

const threatLabel = (count: number): string =>
    count <= 0 ? '' : count === 1 ? '1 menace' : `${count} menaces`;

const pileCountLabel = (count: number): string =>
    count > 0 ? `\n${count}` : '';

const PileBlock: React.FC<{
    variant: 'discard' | 'cemetery';
    owner: 'adverse' | 'toi';
    count: number;
    threats?: number;
    threatLimit?: number;
    onOpen: () => void;
}> = ({
    variant,
    owner,
    count,
    threats = 0,
    threatLimit = 0,
    onOpen,
}) => {
    const showThreats = variant === 'cemetery' && threats > 0;
    const caption = threatLabel(threats);
    const ownerPrefix = owner === 'adverse' ? 'Adv. ' : '';
    const zoneName = variant === 'cemetery' ? 'Cimetière' : 'Défausse';

    return (
        <S.PileBlock
            type="button"
            $variant={variant}
            onClick={onOpen}
            aria-label={`${ownerPrefix}${zoneName}${count > 0 ? `, ${count} cartes` : ', vide'}`}
        >
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
                {ownerPrefix}
                {zoneName}
                {pileCountLabel(count)}
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
    myDiscard,
    myDeadPile,
    opponentDiscard,
    opponentDeadPile,
    onOpenZone,
}) => {
    return (
        <S.Rail>
            <S.PileRow>
                <PileBlock
                    variant="discard"
                    owner="adverse"
                    count={opponentDiscard.length}
                    onOpen={() => onOpenZone('opponent-discard')}
                />
                <PileBlock
                    variant="cemetery"
                    owner="adverse"
                    count={opponentDeadPile.length}
                    threats={fpIsOpponent ? threats : 0}
                    threatLimit={threatLimit}
                    onOpen={() => onOpenZone('opponent-cemetery')}
                />
            </S.PileRow>
            <S.TwilightSlot>
                <TwilightPool value={twilight} />
            </S.TwilightSlot>
            <S.PileRow>
                <PileBlock
                    variant="discard"
                    owner="toi"
                    count={myDiscard.length}
                    onOpen={() => onOpenZone('my-discard')}
                />
                <PileBlock
                    variant="cemetery"
                    owner="toi"
                    count={myDeadPile.length}
                    threats={fpIsOpponent ? 0 : threats}
                    threatLimit={threatLimit}
                    onOpen={() => onOpenZone('my-cemetery')}
                />
            </S.PileRow>
            <S.ChatSlot>Journal / chat (plus tard)</S.ChatSlot>
        </S.Rail>
    );
};
