import React, { useEffect, useState } from 'react';
import { useUiMessages } from '../i18n/ui/useUiMessages';
import { loadMatchCredentials } from '../session/matchCredentials';
import { joinMatchSeat, MatchJoinError } from './joinMatch';

type GateState =
    | { status: 'ready'; credentials: string; playerID: string }
    | { status: 'loading' }
    | { status: 'error'; message: string };

function goHome() {
    const url = new URL(window.location.href);
    url.search = '';
    window.location.href = url.toString();
}

/**
 * Assure credentials boardgame.io avant de monter le Client SocketIO.
 * Si absents en local → join du siège demandé (ou premier libre).
 */
export const MatchSeatGate: React.FC<{
    matchID: string;
    playerID: string;
    children: (seat: {
        credentials: string;
        playerID: string;
    }) => React.ReactNode;
}> = ({ matchID, playerID, children }) => {
    const { match: t } = useUiMessages();
    const [state, setState] = useState<GateState>(() => {
        const existing = loadMatchCredentials(matchID, playerID);
        return existing
            ? { status: 'ready', credentials: existing, playerID }
            : { status: 'loading' };
    });

    useEffect(() => {
        if (state.status === 'ready') return;

        let cancelled = false;

        (async () => {
            try {
                // Siège demandé d’abord ; si pris, premier libre (invité).
                let joined;
                try {
                    joined = await joinMatchSeat(matchID, playerID);
                } catch (err) {
                    if (
                        err instanceof MatchJoinError &&
                        err.code === 'SEAT_TAKEN' &&
                        playerID === '0'
                    ) {
                        joined = await joinMatchSeat(matchID);
                    } else {
                        throw err;
                    }
                }

                if (cancelled) return;

                if (joined.playerID !== playerID) {
                    const url = new URL(window.location.href);
                    url.searchParams.set('player', joined.playerID);
                    url.searchParams.set('match', joined.matchID);
                    url.searchParams.set('view', 'play');
                    window.location.replace(url.toString());
                    return;
                }

                setState({
                    status: 'ready',
                    credentials: joined.credentials,
                    playerID: joined.playerID,
                });
            } catch (err) {
                if (cancelled) return;
                let message = t.joinFailed;
                if (err instanceof MatchJoinError) {
                    if (err.code === 'SEAT_TAKEN') message = t.seatTaken;
                    else if (err.code === 'MATCH_FULL') message = t.matchFull;
                    else if (err.code === 'NOT_FOUND') message = t.notFound;
                }
                setState({ status: 'error', message });
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [matchID, playerID, state.status, t]);

    if (state.status === 'loading') {
        return (
            <GateMessage>
                <p>{t.connecting}</p>
            </GateMessage>
        );
    }

    if (state.status === 'error') {
        return (
            <GateMessage>
                <p>{state.message}</p>
                <button type="button" onClick={goHome}>
                    {t.backHome}
                </button>
            </GateMessage>
        );
    }

    return <>{children(state)}</>;
};

const GateMessage: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => (
    <div
        style={{
            color: '#fff',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            alignItems: 'center',
        }}
    >
        {children}
    </div>
);
