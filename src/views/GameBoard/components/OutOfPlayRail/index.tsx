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
import { usePreferencesOptional } from '../../../../contexts/PreferencesContext';
import { useImageSrcFallback } from '../../../../utils/useImageSrcFallback';
import { usePulseOnChange } from '../../hooks/usePulseOnChange';
import { TwilightPool } from '../TwilightPool';
import { useUiMessages } from '../../../../i18n/ui/useUiMessages';
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

type FeedTab = 'journal' | 'chat';

const MAX_FEED = 80;

const PHASE_ICON: Record<string, string> = {
    FELLOWSHIP: 'interface/icons/phase_fellowship.webp',
    SHADOW: 'interface/icons/phase_shadow.webp',
    MANEUVER: 'interface/icons/phase_maneuver.webp',
    ARCHERY: 'interface/icons/phase_archery.webp',
    ASSIGNMENT: 'interface/icons/phase_assignment.webp',
    SKIRMISH: 'interface/icons/phase_skirmish.webp',
    REGROUP: 'interface/icons/phase_regroup.webp',
    SETUP: 'interface/icons/phase_setup.webp',
};

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

const pileCountLabel = (count: number): string =>
    count > 0 ? `\n${count}` : '';

/** Pioche : verso + compteur, non cliquable. */
const DeckBlock: React.FC<{
    owner: 'adverse' | 'toi';
    count: number;
}> = ({ owner, count }) => {
    const ui = useUiMessages();
    const pulseGen = usePulseOnChange(count);
    const ownerPrefix = owner === 'adverse' ? ui.chrome.rail.advPrefix : '';
    const empty = count <= 0;

    return (
        <S.DeckBlock
            $empty={empty}
            $pulseGen={pulseGen}
            aria-label={`${ownerPrefix}${ui.chrome.rail.drawDeck}${empty ? `, ${ui.chrome.rail.empty}` : `, ${ui.chrome.rail.cardsCount(count)}`}`}
            title={ui.chrome.rail.drawDeckTitle}
        >
            {!empty && (
                <S.DeckBack src="interface/lotr_cardback.webp" alt="" />
            )}
            <S.PileLabel>
                {ownerPrefix}
                {ui.chrome.rail.drawDeck}
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
    const ui = useUiMessages();
    const showThreats = variant === 'cemetery' && threats > 0;
    const caption =
        threats <= 0
            ? ''
            : threats === 1
              ? ui.chrome.rail.threatOne
              : ui.chrome.rail.threats(threats);
    const ownerPrefix = owner === 'adverse' ? ui.chrome.rail.advPrefix : '';
    const zoneName =
        variant === 'cemetery'
            ? ui.chrome.rail.cemetery
            : ui.chrome.rail.discard;

    return (
        <S.PileBlock
            type="button"
            $variant={variant}
            onClick={onOpen}
            aria-label={`${ownerPrefix}${zoneName}${count > 0 ? `, ${ui.chrome.rail.cardsCount(count)}` : `, ${ui.chrome.rail.empty}`}`}
        >
            {showThreats && (
                <S.ThreatDots
                    aria-label={
                        threatLimit > 0
                            ? `${caption} (${ui.chrome.rail.threatLimit(threatLimit)})`
                            : caption
                    }
                    title={
                        threatLimit > 0
                            ? `${caption} · ${ui.chrome.rail.threatLimit(threatLimit)}`
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
    const ui = useUiMessages();
    if (count <= 0) return null;
    const ownerPrefix = owner === 'adverse' ? ui.chrome.rail.advPrefix : '';
    return (
        <S.PileRow>
            <S.RemovedBlock
                type="button"
                onClick={onOpen}
                aria-label={`${ownerPrefix}${ui.chrome.rail.removed(count)}`}
            >
                <S.PileLabel>
                    {ownerPrefix}
                    {ui.chrome.rail.removed(count)}
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
    const usedMatch = entry.named.match(
        /^(.*?)\s+(a utilisé|a joué|avez joué)\s+/i
    );
    const namedActor = usedMatch?.[1]?.trim() || '';
    const rawVerb = (usedMatch?.[2] || 'a joué').toLowerCase();
    const isUsed = rawVerb.includes('utilisé');
    const actorLabel = isUsed
        ? namedActor || text
        : mine
          ? 'Vous'
          : namedActor || text;
    const verb = isUsed
        ? 'a utilisé'
        : mine
          ? 'avez joué'
          : 'a joué';
    const landscape = played.orientation === 'landscape';
    // Vignette : cartes jouées seulement (pas les compétences).
    const showThumb = played.showThumb !== false;

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
            {!isUsed && entry.actorAvatar ? (
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
            {showThumb ? (
                <JournalCardThumb
                    imageUrl={played.imageUrl}
                    landscape={landscape}
                />
            ) : null}
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
    const ui = useUiMessages();
    const prefs = usePreferencesOptional();
    const uiLanguage = prefs?.uiLanguage ?? 'fr';
    const holderLabel =
        initiativeHolder === 'FREE_PEOPLE'
            ? ui.chrome.common.freePeoples
            : ui.chrome.common.shadow;
    const prevHolderRef = useRef(initiativeHolder);
    const [pulseKey, setPulseKey] = useState(0);
    const [feed, setFeed] = useState<FeedEntry[]>([]);
    const [feedTab, setFeedTab] = useState<FeedTab>('journal');
    const [draft, setDraft] = useState('');
    const seenChatIdsRef = useRef<Set<string>>(new Set());
    const seenJournalLenRef = useRef(0);
    const feedEndRef = useRef<HTMLDivElement>(null);
    const uiLangRef = useRef(uiLanguage);

    useEffect(() => {
        if (prevHolderRef.current === initiativeHolder) return;
        prevHolderRef.current = initiativeHolder;
        setPulseKey((key) => key + 1);
    }, [initiativeHolder]);

    // Changement de langue UI → reconstruire les textes journal déjà en fil.
    useEffect(() => {
        if (uiLangRef.current === uiLanguage) return;
        uiLangRef.current = uiLanguage;
        seenJournalLenRef.current = 0;
        setFeed((prev) => prev.filter((e) => e.kind === 'chat'));
    }, [uiLanguage]);

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
                    text: formatJournalEntry(
                        normalized,
                        myPlayerId,
                        uiLanguage
                    ),
                    entry: normalized,
                };
            });
        seenJournalLenRef.current = log.length;
        if (!additions.length) return;
        setFeed((prev) => {
            const next = [...prev, ...additions];
            return next.length > MAX_FEED ? next.slice(-MAX_FEED) : next;
        });
    }, [journalLog, myPlayerId, uiLanguage]);

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
    }, [feed, feedTab]);

    const visibleFeed =
        feedTab === 'chat'
            ? feed.filter((entry) => entry.kind === 'chat')
            : feed;

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
                    title={ui.chrome.rail.initiativeTitle}
                >
                    <S.InitiativeChipLabel $mine={localHasInitiative}>
                        {ui.chrome.rail.initiative}
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
                <S.ChatTabs
                    role="tablist"
                    aria-label={ui.chrome.rail.filterFeed}
                >
                    <S.ChatTab
                        type="button"
                        role="tab"
                        aria-selected={feedTab === 'journal'}
                        $active={feedTab === 'journal'}
                        onClick={() => setFeedTab('journal')}
                    >
                        {ui.chrome.rail.journal}
                    </S.ChatTab>
                    <S.ChatTab
                        type="button"
                        role="tab"
                        aria-selected={feedTab === 'chat'}
                        $active={feedTab === 'chat'}
                        onClick={() => setFeedTab('chat')}
                    >
                        {ui.chrome.rail.chat}
                    </S.ChatTab>
                </S.ChatTabs>
                <S.ChatFeed
                    aria-live="polite"
                    aria-label={
                        feedTab === 'chat'
                            ? ui.chrome.rail.chatMessages
                            : ui.chrome.rail.gameJournal
                    }
                >
                    {visibleFeed.length === 0 ? (
                        <S.ChatEmpty>
                            {feedTab === 'chat'
                                ? ui.chrome.rail.noChat
                                : ui.chrome.rail.gameJournal}
                        </S.ChatEmpty>
                    ) : (
                        visibleFeed.map((entry) =>
                            entry.kind === 'journal' ? (
                                entry.entry.kind === 'phase' ? (
                                    <S.ChatEntry key={entry.key} $kind="phase">
                                        <S.JournalPhaseRow>
                                            {entry.entry.phaseKey &&
                                            PHASE_ICON[entry.entry.phaseKey] ? (
                                                <S.JournalPhaseIcon
                                                    src={
                                                        PHASE_ICON[
                                                            entry.entry.phaseKey
                                                        ]
                                                    }
                                                    alt=""
                                                />
                                            ) : null}
                                            <S.JournalPhaseLabel>
                                                {entry.text}
                                            </S.JournalPhaseLabel>
                                        </S.JournalPhaseRow>
                                    </S.ChatEntry>
                                ) : (
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
                                )
                            ) : (
                                <S.ChatEntry key={entry.key} $kind="chat">
                                    <S.ChatSender $mine={entry.mine}>
                                        {entry.mine
                                            ? ui.chrome.common.you
                                            : entry.senderName}
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
                            canSend
                                ? ui.chrome.rail.writePlaceholder
                                : ui.chrome.rail.chatUnavailable
                        }
                        disabled={!canSend}
                        maxLength={400}
                        aria-label={ui.chrome.rail.chatMessageAria}
                    />
                    <S.ChatSend
                        type="submit"
                        disabled={!canSend || !draft.trim()}
                    >
                        {ui.chrome.rail.send}
                    </S.ChatSend>
                </S.ChatForm>
            </S.ChatSlot>
        </S.Rail>
    );
};
