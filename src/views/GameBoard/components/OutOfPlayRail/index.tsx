import React, { useEffect, useRef, useState } from 'react';
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
    /** Qui détient l’initiative (FP si main FP ≥ 4, sinon Ombre). */
    initiativeHolder: 'FREE_PEOPLE' | 'SHADOW';
    /** Vrai si le joueur local a l’initiative (bordure jaune vs grise). */
    localHasInitiative: boolean;
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
    initiativeHolder,
    localHasInitiative,
    myDiscard,
    myDeadPile,
    opponentDiscard,
    opponentDeadPile,
    onOpenZone,
}) => {
    const holderLabel =
        initiativeHolder === 'FREE_PEOPLE' ? 'Peuples Libres' : 'Ombre';
    const prevHolderRef = useRef(initiativeHolder);
    const [pulseKey, setPulseKey] = useState(0);

    useEffect(() => {
        if (prevHolderRef.current === initiativeHolder) return;
        prevHolderRef.current = initiativeHolder;
        setPulseKey((key) => key + 1);
    }, [initiativeHolder]);

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
                <S.TwilightBowl>
                    <TwilightPool value={twilight} />
                </S.TwilightBowl>
                <S.InitiativeChip
                    key={pulseKey}
                    $mine={localHasInitiative}
                    $pulse={pulseKey > 0}
                    title="Le joueur Peuples Libres a l’initiative s’il a au moins 4 cartes en main ; sinon l’Ombre l’a."
                >
                    <S.InitiativeChipLabel $mine={localHasInitiative}>
                        Initiative
                    </S.InitiativeChipLabel>
                    <S.InitiativeChipHolder $mine={localHasInitiative}>
                        {holderLabel}
                    </S.InitiativeChipHolder>
                </S.InitiativeChip>
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
