import React, { useEffect, useRef, useState } from 'react';
import type { CardState, JournalEntry, SiteCardState } from '../../../../game/types';
import {
    listPlayerChatMessages,
    makePlayerChatPayload,
    type ChatLike,
} from '../../../../game/chat/playerChat';
import { formatJournalEntry } from '../../../../game/logic/journal';
import { getCardById } from '../../../../game/cardsData';
import { useHoverCard } from '../../../../contexts/HoverCardContext';
import { useImageSrcFallback } from '../../../../utils/useImageSrcFallback';
import { usePulseOnChange } from '../../hooks/usePulseOnChange';
import { TwilightPool } from '../TwilightPool';
import * as S from './styles';

export type OutOfPlayZoneKey =
    | 'opponent-discard'
    | 'opponent-cemetery'
    | 'opponent-removed'
    | 'my-discard'
    | 'my-cemetery'
    | 'my-removed';

type FeedEntry =
    | { kind: 'journal'; key: string; text: string; entry: JournalEntry }
    | {
          kind: 'chat';
          key: string;
          text: string;
          senderName: string;
          mine: boolean;
      };

const MAX_FEED = 80;

interface OutOfPlayRailProps {
    twilight: number;
    fpIsOpponent: boolean;
    threats: number;
    threatLimit: number;
    /** Qui détient l’initiative (FP si main FP ≥ 4, sinon Ombre). */
    initiativeHolder: 'FREE_PEOPLE' | 'SHADOW';
    /** Vrai si le joueur local a l’initiative (bordure jaune vs grise). */
    localHasInitiative: boolean;
    /** Taille de la pioche (face cachée — pas de consultation). */
    myDeckCount: number;
    opponentDeckCount: number;
    myDiscard: CardState[];
    myDeadPile: CardState[];
    myRemovedFromGame: CardState[];
    opponentDiscard: CardState[];
    opponentDeadPile: CardState[];
    opponentRemovedFromGame: CardState[];
    onOpenZone: (zone: OutOfPlayZoneKey) => void;
    /** Faits passés (pas consignes / attentes). */
    journalLog?: JournalEntry[];
    myPlayerId?: string;
    /** Noms de profil par id de siège (`0` / `1`). */
    playerNames?: Record<string, string>;
    chatMessages?: ChatLike[];
    sendChatMessage?: (payload: unknown) => void;
}

const threatLabel = (count: number): string =>
    count <= 0 ? '' : count === 1 ? '1 menace' : `${count} menaces`;

const pileCountLabel = (count: number): string =>
    count > 0 ? `\n${count}` : '';

/** Pioche : verso + compteur, non cliquable. */
const DeckBlock: React.FC<{
    owner: 'adverse' | 'toi';
    count: number;
}> = ({ owner, count }) => {
    const pulseGen = usePulseOnChange(count);
    const ownerPrefix = owner === 'adverse' ? 'Adv. ' : '';
    const empty = count <= 0;

    return (
        <S.DeckBlock
            $empty={empty}
            $pulseGen={pulseGen}
            aria-label={`${ownerPrefix}Pioche${empty ? ', vide' : `, ${count} cartes`} (non consultable)`}
            title="Pioche — face cachée, non consultable"
        >
            {!empty && (
                <S.DeckBack src="interface/lotr_cardback.webp" alt="" />
            )}
            <S.PileLabel>
                {ownerPrefix}
                Pioche
                {`\n${count}`}
            </S.PileLabel>
        </S.DeckBlock>
    );
};

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

/** Pile compacte « retirées du jeu » — affichée seulement si non vide. */
const RemovedBlock: React.FC<{
    owner: 'adverse' | 'toi';
    count: number;
    onOpen: () => void;
}> = ({ owner, count, onOpen }) => {
    if (count <= 0) return null;
    const ownerPrefix = owner === 'adverse' ? 'Adv. ' : '';
    return (
        <S.PileRow>
            <S.RemovedBlock
                type="button"
                onClick={onOpen}
                aria-label={`${ownerPrefix}Cartes retirées du jeu, ${count} cartes`}
            >
                <S.PileLabel>
                    {ownerPrefix}
                    Retirées du jeu · {count}
                </S.PileLabel>
            </S.RemovedBlock>
        </S.PileRow>
    );
};

const JournalCardThumb: React.FC<{
    imageUrl?: string;
    landscape?: boolean;
}> = ({ imageUrl, landscape }) => {
    const { src, onError } = useImageSrcFallback(
        imageUrl,
        'interface/lotr_cardback.webp'
    );
    if (!src) return null;
    if (landscape) {
        return (
            <S.JournalThumbSiteWrap>
                <S.JournalThumbSite src={src} alt="" onError={onError} />
            </S.JournalThumbSiteWrap>
        );
    }
    return <S.JournalThumb src={src} alt="" onError={onError} />;
};

const JournalPlayEntry: React.FC<{
    entry: JournalEntry;
    text: string;
    myPlayerId?: string;
}> = ({ entry, text, myPlayerId }) => {
    const { setHoveredCard } = useHoverCard();
    const played = entry.playedCard;
    if (!played) {
        return <>{text}</>;
    }

    const mine =
        entry.actorId != null &&
        myPlayerId != null &&
        String(entry.actorId) === String(myPlayerId);
    const namedActor =
        entry.named.match(/^(.*?)\s+a joué\s+/i)?.[1]?.trim() || '';
    const actorLabel = mine ? 'Vous' : namedActor || text;
    const verb = mine ? 'avez joué' : 'a joué';
    const landscape = played.orientation === 'landscape';

    const resolveHoverCard = (): CardState | SiteCardState | null => {
        const fromDb = getCardById(played.catalogId);
        if (fromDb) return fromDb;
        if (!played.imageUrl && !played.catalogId) return null;
        return {
            id: played.catalogId || 'journal-card',
            instanceId: `journal-${played.catalogId || 'card'}`,
            imageUrl: played.imageUrl,
            kind: landscape ? 'SITE' : 'FREE_PEOPLE',
            type: landscape ? 'SITE' : 'COMPANION',
            culture: 'GONDOR',
            set: 0,
            rarity: '',
            isUnique: false,
            title: played.label,
            name: played.label,
        } as CardState & SiteCardState;
    };

    return (
        <S.JournalPlayRow>
            {entry.actorAvatar ? (
                <S.JournalAvatar src={entry.actorAvatar} alt="" />
            ) : null}
            <S.JournalActor>{actorLabel}</S.JournalActor>
            <span>{verb}</span>
            <S.JournalCardLink
                type="button"
                onMouseEnter={() => {
                    const card = resolveHoverCard();
                    if (card) {
                        setHoveredCard(
                            card,
                            landscape ? 'landscape' : 'portrait'
                        );
                    }
                }}
                onMouseLeave={() => setHoveredCard(null)}
            >
                {played.label}
            </S.JournalCardLink>
            <JournalCardThumb
                imageUrl={played.imageUrl}
                landscape={landscape}
            />
        </S.JournalPlayRow>
    );
};

export const OutOfPlayRail: React.FC<OutOfPlayRailProps> = ({
    twilight,
    fpIsOpponent,
    threats,
    threatLimit,
    initiativeHolder,
    localHasInitiative,
    myDeckCount,
    opponentDeckCount,
    myDiscard,
    myDeadPile,
    myRemovedFromGame,
    opponentDiscard,
    opponentDeadPile,
    opponentRemovedFromGame,
    onOpenZone,
    journalLog,
    myPlayerId,
    playerNames,
    chatMessages,
    sendChatMessage,
}) => {
    const holderLabel =
        initiativeHolder === 'FREE_PEOPLE' ? 'Peuples Libres' : 'Ombre';
    const prevHolderRef = useRef(initiativeHolder);
    const [pulseKey, setPulseKey] = useState(0);
    const [feed, setFeed] = useState<FeedEntry[]>([]);
    const [draft, setDraft] = useState('');
    const seenChatIdsRef = useRef<Set<string>>(new Set());
    const seenJournalLenRef = useRef(0);
    const feedEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (prevHolderRef.current === initiativeHolder) return;
        prevHolderRef.current = initiativeHolder;
        setPulseKey((key) => key + 1);
    }, [initiativeHolder]);

    useEffect(() => {
        const log = journalLog ?? [];
        if (log.length < seenJournalLenRef.current) {
            seenJournalLenRef.current = 0;
            seenChatIdsRef.current = new Set();
            setFeed([]);
        }
        if (log.length === seenJournalLenRef.current) return;
        const additions: FeedEntry[] = log
            .slice(seenJournalLenRef.current)
            .map((entry, index) => {
                const normalized =
                    typeof entry === 'string'
                        ? ({ named: entry } as JournalEntry)
                        : entry;
                return {
                    kind: 'journal' as const,
                    key: `journal-${seenJournalLenRef.current + index}`,
                    text: formatJournalEntry(normalized, myPlayerId),
                    entry: normalized,
                };
            });
        seenJournalLenRef.current = log.length;
        if (!additions.length) return;
        setFeed((prev) => {
            const next = [...prev, ...additions];
            return next.length > MAX_FEED ? next.slice(-MAX_FEED) : next;
        });
    }, [journalLog, myPlayerId]);

    useEffect(() => {
        const playerChats = listPlayerChatMessages(chatMessages);
        if (!playerChats.length) return;
        const additions: FeedEntry[] = [];
        for (const message of playerChats) {
            if (seenChatIdsRef.current.has(message.id)) continue;
            seenChatIdsRef.current.add(message.id);
            const mine =
                Boolean(myPlayerId) && message.sender === myPlayerId;
            const senderName =
                playerNames?.[message.sender]?.trim() ||
                `Joueur ${message.sender}`;
            additions.push({
                kind: 'chat',
                key: message.id,
                text: message.text,
                senderName,
                mine,
            });
        }
        if (!additions.length) return;
        setFeed((prev) => {
            const next = [...prev, ...additions];
            return next.length > MAX_FEED ? next.slice(-MAX_FEED) : next;
        });
    }, [chatMessages, myPlayerId, playerNames]);

    useEffect(() => {
        feedEndRef.current?.scrollIntoView({ block: 'end' });
    }, [feed]);

    const canSend = Boolean(sendChatMessage);
    const handleSubmit = (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSend) return;
        const payload = makePlayerChatPayload(draft);
        if (!payload) return;
        sendChatMessage?.(payload);
        setDraft('');
    };

    return (
        <S.Rail>
            <S.PileRow>
                <DeckBlock owner="adverse" count={opponentDeckCount} />
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
            <RemovedBlock
                owner="adverse"
                count={opponentRemovedFromGame.length}
                onOpen={() => onOpenZone('opponent-removed')}
            />
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
                <DeckBlock owner="toi" count={myDeckCount} />
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
            <RemovedBlock
                owner="toi"
                count={myRemovedFromGame.length}
                onOpen={() => onOpenZone('my-removed')}
            />
            <S.ChatSlot>
                <S.ChatFeed aria-live="polite" aria-label="Journal et chat">
                    {feed.length === 0 ? (
                        <S.ChatEmpty>Journal et chat de la partie</S.ChatEmpty>
                    ) : (
                        feed.map((entry) =>
                            entry.kind === 'journal' ? (
                                <S.ChatEntry key={entry.key} $kind="journal">
                                    {entry.entry.playedCard ? (
                                        <JournalPlayEntry
                                            entry={entry.entry}
                                            text={entry.text}
                                            myPlayerId={myPlayerId}
                                        />
                                    ) : (
                                        entry.text
                                    )}
                                </S.ChatEntry>
                            ) : (
                                <S.ChatEntry key={entry.key} $kind="chat">
                                    <S.ChatSender $mine={entry.mine}>
                                        {entry.mine ? 'Vous' : entry.senderName}
                                    </S.ChatSender>
                                    {entry.text}
                                </S.ChatEntry>
                            )
                        )
                    )}
                    <div ref={feedEndRef} />
                </S.ChatFeed>
                <S.ChatForm onSubmit={handleSubmit}>
                    <S.ChatInput
                        type="text"
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={
                            canSend ? 'Écrire…' : 'Chat indisponible'
                        }
                        disabled={!canSend}
                        maxLength={400}
                        aria-label="Message de chat"
                    />
                    <S.ChatSend
                        type="submit"
                        disabled={!canSend || !draft.trim()}
                    >
                        Envoyer
                    </S.ChatSend>
                </S.ChatForm>
            </S.ChatSlot>
        </S.Rail>
    );
};
