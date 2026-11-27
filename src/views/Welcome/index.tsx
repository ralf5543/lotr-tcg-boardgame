import React, { useEffect, useRef, useState } from 'react';
import { OptionsModal } from '../GameBoard/components/OptionsModal';
import { useUiMessages } from '../../i18n/ui/useUiMessages';
import {
    createMatchWithSelectedDecks,
    MatchCreateError,
    prepareGuestLoadout,
} from '../../decks/startMatch';
import {
    assignDeckToPlayer,
    getSelectedDeckIds,
    listDecks,
} from '../../decks/deckStorage';
import { validateDeck } from '../../decks/validateDeck';
import type { DeckConfig } from '../../decks/types';
import {
    joinMatchSeat,
    MatchJoinError,
    type JoinedMatch,
} from '../../match/joinMatch';
import { cancelHostWaitingMatch } from '../../match/leaveMatch';
import {
    isPlausibleMatchCode,
    normalizeMatchCode,
} from '../../match/matchCode';
import { fetchMatchMeta, matchHasGuest } from '../../match/fetchMatch';
import * as S from './styles';

type Panel = 'menu' | 'play' | 'host' | 'join';

function goTo(search: string) {
    const url = new URL(window.location.href);
    url.search = search.startsWith('?') ? search.slice(1) : search;
    window.location.href = url.toString();
}

function goToMatch(joined: JoinedMatch) {
    goTo(
        `?view=play&player=${encodeURIComponent(joined.playerID)}&match=${encodeURIComponent(joined.matchID)}`
    );
}

export const Welcome: React.FC = () => {
    const { welcome, options: opt, deckBuilder: db, match: mt } =
        useUiMessages();
    const [optionsOpen, setOptionsOpen] = useState(false);
    const [panel, setPanel] = useState<Panel>('menu');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hostMatch, setHostMatch] = useState<JoinedMatch | null>(null);
    const [guestReady, setGuestReady] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [copied, setCopied] = useState(false);
    const [decks, setDecks] = useState<DeckConfig[]>([]);
    const [deckId, setDeckId] = useState('');

    const hostMatchRef = useRef<JoinedMatch | null>(null);
    const guestReadyRef = useRef(false);
    const enteringMatchRef = useRef(false);

    useEffect(() => {
        hostMatchRef.current = hostMatch;
    }, [hostMatch]);

    useEffect(() => {
        guestReadyRef.current = guestReady;
    }, [guestReady]);

    useEffect(() => {
        let cancelled = false;
        void listDecks().then((list) => {
            if (cancelled) return;
            setDecks(list);
            const preferred = getSelectedDeckIds()['0'];
            const initial =
                (preferred && list.some((d) => d.id === preferred)
                    ? preferred
                    : list[0]?.id) || '';
            setDeckId(initial);
        });
        return () => {
            cancelled = true;
        };
    }, []);

    /** Hôte : poll jusqu’à ce que le siège 1 ait un nom (lobby), puis entrée. */
    useEffect(() => {
        if (panel !== 'host' || !hostMatch || guestReady) return;

        let cancelled = false;
        let timer: ReturnType<typeof setTimeout> | undefined;

        const poll = async () => {
            try {
                const meta = await fetchMatchMeta(hostMatch.matchID);
                if (cancelled) return;
                if (matchHasGuest(meta)) {
                    enteringMatchRef.current = true;
                    setGuestReady(true);
                    goToMatch(hostMatch);
                    return;
                }
            } catch {
                /* retry — match wipe → 404, on réessaie jusqu’à Retour */
            }
            if (!cancelled) {
                timer = setTimeout(() => {
                    void poll();
                }, 2000);
            }
        };

        void poll();

        return () => {
            cancelled = true;
            if (timer) clearTimeout(timer);
        };
    }, [panel, hostMatch, guestReady]);

    /**
     * Fermeture / navigation hors page pendant l’attente hôte
     * → leave + wipe (code inutilisable). Pas si on entre en partie.
     */
    useEffect(() => {
        if (panel !== 'host') return;

        const onPageHide = () => {
            const host = hostMatchRef.current;
            if (!host || guestReadyRef.current || enteringMatchRef.current) {
                return;
            }
            void cancelHostWaitingMatch(host, { keepalive: true });
        };

        window.addEventListener('pagehide', onPageHide);
        return () => window.removeEventListener('pagehide', onPageHide);
    }, [panel]);

    const selectedDeck = decks.find((d) => d.id === deckId);

    const onDeckChange = (nextId: string) => {
        setDeckId(nextId);
        if (nextId) assignDeckToPlayer('0', nextId);
    };

    const createMatch = async () => {
        if (busy) return;
        if (!selectedDeck) {
            setError(db.errors.startMatch);
            return;
        }
        const deckCheck = validateDeck(selectedDeck);
        if (!deckCheck.ok) {
            setError(
                deckCheck.errors[0]?.message || db.errors.startMatch
            );
            return;
        }
        setBusy(true);
        setError(null);
        try {
            assignDeckToPlayer('0', selectedDeck.id);
            const joined = await createMatchWithSelectedDecks(selectedDeck);
            enteringMatchRef.current = false;
            setHostMatch(joined);
            setGuestReady(false);
            setCopied(false);
            setPanel('host');
        } catch (err) {
            console.error(err);
            const message =
                err instanceof MatchCreateError && err.code === 'SERVER_FULL'
                    ? db.errors.serverFull
                    : err instanceof Error
                      ? err.message
                      : db.errors.startMatch;
            setError(message);
        } finally {
            setBusy(false);
        }
    };

    const copyCode = async () => {
        if (!hostMatch) return;
        try {
            await navigator.clipboard.writeText(hostMatch.matchID);
            setCopied(true);
        } catch {
            /* sélection manuelle possible via user-select */
        }
    };

    const submitJoin = async () => {
        if (busy) return;
        const code = normalizeMatchCode(joinCode);
        if (!isPlausibleMatchCode(code)) {
            setError(mt.invalidCode);
            return;
        }
        if (!selectedDeck) {
            setError(db.errors.startMatch);
            return;
        }
        const deckCheck = validateDeck(selectedDeck);
        if (!deckCheck.ok) {
            setError(
                deckCheck.errors[0]?.message || db.errors.startMatch
            );
            return;
        }
        setBusy(true);
        setError(null);
        try {
            assignDeckToPlayer('0', selectedDeck.id);
            await prepareGuestLoadout(selectedDeck);
            const joined = await joinMatchSeat(code);
            goToMatch(joined);
        } catch (err) {
            console.error(err);
            let message = mt.joinFailed;
            if (err instanceof MatchJoinError) {
                if (err.code === 'SEAT_TAKEN') message = mt.seatTaken;
                else if (err.code === 'MATCH_FULL') message = mt.matchFull;
                else if (err.code === 'NOT_FOUND') message = mt.notFound;
            }
            setError(message);
            setBusy(false);
        }
    };

    const resetLocalLobbyState = () => {
        setPanel('menu');
        setError(null);
        setJoinCode('');
        setCopied(false);
        setHostMatch(null);
        setGuestReady(false);
        enteringMatchRef.current = false;
    };

    const cancelHostAndLeave = async () => {
        if (!hostMatch) {
            resetLocalLobbyState();
            return;
        }
        if (!window.confirm(mt.cancelHostPrompt)) return;
        setBusy(true);
        try {
            await cancelHostWaitingMatch(hostMatch);
        } finally {
            setBusy(false);
            resetLocalLobbyState();
        }
    };

    const backToMenu = () => {
        setPanel('menu');
        setError(null);
        setJoinCode('');
        setCopied(false);
    };

    const backToPlay = () => {
        setPanel('play');
        setError(null);
        setJoinCode('');
    };

    const deckField = (
        <S.Field>
            {mt.deckLabel}
            <S.Select
                value={deckId}
                disabled={busy || decks.length === 0}
                onChange={(event) => onDeckChange(event.target.value)}
            >
                {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                        {deck.name}
                    </option>
                ))}
            </S.Select>
        </S.Field>
    );

    return (
        <S.Root>
            <S.Scene>
                <S.Foliage aria-hidden />
            </S.Scene>
            {panel === 'menu' && (
                <S.Menu aria-label={welcome.menuAria}>
                    <S.MenuButton
                        type="button"
                        onClick={() => {
                            setError(null);
                            setPanel('play');
                        }}
                    >
                        {welcome.play}
                    </S.MenuButton>
                    <S.MenuButton
                        type="button"
                        onClick={() => setOptionsOpen(true)}
                    >
                        {opt.title}
                    </S.MenuButton>
                    <S.MenuButton type="button" disabled title={welcome.soon}>
                        {welcome.tutorial}
                    </S.MenuButton>
                </S.Menu>
            )}

            {panel === 'play' && (
                <S.Panel>
                    <S.PanelTitle>{welcome.play}</S.PanelTitle>
                    {deckField}
                    <S.ButtonRow>
                        <S.MenuButton
                            type="button"
                            disabled={busy || !selectedDeck}
                            onClick={() => {
                                void createMatch();
                            }}
                        >
                            {busy ? mt.creating : welcome.create}
                        </S.MenuButton>
                        <S.MenuButton
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                setError(null);
                                setPanel('join');
                            }}
                        >
                            {welcome.join}
                        </S.MenuButton>
                        <S.MenuButton
                            type="button"
                            disabled={busy}
                            onClick={backToMenu}
                        >
                            {mt.cancel}
                        </S.MenuButton>
                    </S.ButtonRow>
                    {error && <S.ErrorText>{error}</S.ErrorText>}
                </S.Panel>
            )}

            {panel === 'host' && hostMatch && (
                <S.Panel>
                    <S.PanelTitle>{mt.codeLabel}</S.PanelTitle>
                    <S.CodeBox>{hostMatch.matchID}</S.CodeBox>
                    <S.PanelHint>{mt.codeHint}</S.PanelHint>
                    <S.PanelHint>
                        {guestReady
                            ? mt.opponentJoined
                            : mt.waitingOpponent}
                    </S.PanelHint>
                    <S.ButtonRow>
                        <S.MenuButton
                            type="button"
                            onClick={() => void copyCode()}
                        >
                            {copied ? mt.copied : mt.copyCode}
                        </S.MenuButton>
                        <S.MenuButton
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                void cancelHostAndLeave();
                            }}
                        >
                            {mt.cancel}
                        </S.MenuButton>
                    </S.ButtonRow>
                </S.Panel>
            )}

            {panel === 'join' && (
                <S.PanelForm
                    onSubmit={(event) => {
                        event.preventDefault();
                        void submitJoin();
                    }}
                >
                    <S.PanelTitle>{welcome.join}</S.PanelTitle>
                    {deckField}
                    <S.Field>
                        {mt.joinCodeLabel}
                        <S.TextInput
                            value={joinCode}
                            autoComplete="off"
                            autoCapitalize="off"
                            spellCheck={false}
                            placeholder={mt.joinCodePlaceholder}
                            disabled={busy}
                            onChange={(event) =>
                                setJoinCode(event.target.value)
                            }
                        />
                    </S.Field>
                    {error && <S.ErrorText>{error}</S.ErrorText>}
                    <S.ButtonRow>
                        <S.MenuButton
                            type="submit"
                            disabled={busy || !selectedDeck}
                        >
                            {busy ? mt.joining : mt.joinSubmit}
                        </S.MenuButton>
                        <S.MenuButton
                            type="button"
                            disabled={busy}
                            onClick={backToPlay}
                        >
                            {mt.cancel}
                        </S.MenuButton>
                    </S.ButtonRow>
                </S.PanelForm>
            )}

            {optionsOpen && (
                <OptionsModal
                    showQuitToHome={false}
                    onClose={() => setOptionsOpen(false)}
                />
            )}
        </S.Root>
    );
};
