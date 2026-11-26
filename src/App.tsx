import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Client } from 'boardgame.io/react';
import { SocketIO } from 'boardgame.io/multiplayer';
import { LotrGame } from './game';
import { isBotMatchFromUrl } from './game/bot';
import { SoloBotMatch } from './game/bot/SoloBotMatch';
import { GameBoard } from './views/GameBoard';
import { DeckBuilder } from './views/DeckBuilder';
import { Welcome } from './views/Welcome';
import { HoverCardProvider } from './contexts/HoverCardProvider';
import { CustomAssetCursor } from './views/GameBoard/components/CustomCursor';
import { DragProvider } from './contexts/DragProvider';
import { FactionProvider } from './contexts/FactionProvider';
import { TargetingProvider } from './contexts/TargetingContext';
import { audioService } from './services/audioService';
import { initFullscreenEscapeLock } from './utils/fullscreen';
import { PreferencesProvider } from './contexts/PreferencesProvider';
import { getGameServerUrl } from './config/gameServer';
import { MatchSeatGate } from './match/MatchSeatGate';

initFullscreenEscapeLock();

/** Multi humain : toujours SocketIO (Local = uniquement le mode BOT). */
const LotrClient = Client({
    game: LotrGame,
    board: GameBoard,
    numPlayers: 2,
    multiplayer: SocketIO({ server: getGameServerUrl() }),
    debug: false,
});

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const syncChannel = new BroadcastChannel('lotr_match_sync');

type AppScreen = 'welcome' | 'decks' | 'play';

function resolveScreen(search: string): {
    screen: AppScreen;
    myPlayerId: string;
    currentMatchId: string;
    isBotMatch: boolean;
} {
    const searchParams = new URLSearchParams(search);
    const bot = isBotMatchFromUrl(search);
    const view = searchParams.get('view') || '';
    const myPlayerId = bot ? '0' : searchParams.get('player') || '0';
    const currentMatchId = searchParams.get('match') || 'default';

    if (view === 'decks') {
        return { screen: 'decks', myPlayerId, currentMatchId, isBotMatch: bot };
    }

    // Partie explicite, BOT, ou deep-link playtest (?player= / ?match=).
    const wantsPlay =
        view === 'play' ||
        bot ||
        searchParams.has('player') ||
        searchParams.has('match');

    if (wantsPlay) {
        return { screen: 'play', myPlayerId, currentMatchId, isBotMatch: bot };
    }

    return {
        screen: 'welcome',
        myPlayerId,
        currentMatchId,
        isBotMatch: false,
    };
}

function App() {
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    const [{ screen, myPlayerId, currentMatchId, isBotMatch }] = useState(() =>
        resolveScreen(window.location.search)
    );

    // Accueil / decks : curseur système (pas le curseur custom du plateau).
    useEffect(() => {
        if (screen === 'play') return;
        document.body.classList.add('native-cursor');
        return () => document.body.classList.remove('native-cursor');
    }, [screen]);

    useEffect(() => {
        const handleGlobalClick = (event: MouseEvent) => {
            const target = event.target as HTMLElement | null;
            const buttonElement = target?.closest('button, [role="button"]');

            if (buttonElement && !buttonElement.hasAttribute('disabled')) {
                audioService.play('CLICK');
            }
        };

        document.body.addEventListener('click', handleGlobalClick, true);
        return () => {
            document.body.removeEventListener('click', handleGlobalClick, true);
        };
    }, []);

    useEffect(() => {
        const handleSync = (event: MessageEvent) => {
            if (event.data?.type === 'NEW_MATCH') {
                const url = new URL(window.location.href);
                url.searchParams.set('view', 'play');
                url.searchParams.set('match', event.data.matchId);
                url.searchParams.delete('bot');
                window.location.href = url.toString();
            }
        };

        syncChannel.addEventListener('message', handleSync);
        return () => syncChannel.removeEventListener('message', handleSync);
    }, []);

    useEffect(() => {
        if (screen === 'welcome') return;

        const handleResize = () => {
            if (!containerRef.current) return;

            const scaleX = window.innerWidth / DESIGN_WIDTH;
            const scaleY = window.innerHeight / DESIGN_HEIGHT;

            setScale(Math.min(scaleX, scaleY));
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, [screen]);

    if (screen === 'welcome') {
        return (
            <PreferencesProvider>
                <ScreenViewport>
                    <Welcome />
                </ScreenViewport>
            </PreferencesProvider>
        );
    }

    if (screen === 'decks') {
        return (
            <PreferencesProvider>
                <ScreenViewport>
                    <FactionProvider myPlayerId={myPlayerId}>
                        <HoverCardProvider>
                            <DragProvider>
                                <ScaledView ref={containerRef} $scale={scale}>
                                    <DeckBuilder />
                                </ScaledView>
                            </DragProvider>
                        </HoverCardProvider>
                    </FactionProvider>
                </ScreenViewport>
            </PreferencesProvider>
        );
    }

    if (!myPlayerId) {
        return <div>Chargement de la session du joueur...</div>;
    }

    return (
        <PreferencesProvider>
            <ScreenViewport>
                <FactionProvider myPlayerId={myPlayerId}>
                    <HoverCardProvider>
                        <DragProvider>
                            <TargetingProvider>
                                <ScaledView ref={containerRef} $scale={scale}>
                                    {isBotMatch ? (
                                        <SoloBotMatch
                                            matchID={currentMatchId}
                                        />
                                    ) : (
                                        <MatchSeatGate
                                            matchID={currentMatchId}
                                            playerID={myPlayerId}
                                        >
                                            {(seat) => (
                                                <LotrClient
                                                    matchID={currentMatchId}
                                                    playerID={seat.playerID}
                                                    credentials={
                                                        seat.credentials
                                                    }
                                                />
                                            )}
                                        </MatchSeatGate>
                                    )}
                                </ScaledView>
                            </TargetingProvider>
                            <CustomAssetCursor />
                        </DragProvider>
                    </HoverCardProvider>
                </FactionProvider>
            </ScreenViewport>
        </PreferencesProvider>
    );
}

export default App;

const ScreenViewport = styled.div`
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background-color: black;
`;

const ScaledView = styled.div<{ $scale: number }>`
    width: ${DESIGN_WIDTH}px;
    height: ${DESIGN_HEIGHT}px;
    position: relative;
    transform-origin: center center;
    transform: scale(${(props) => props.$scale});
    flex-shrink: 0;
    overflow: hidden;

    & > div {
        height: 100%;
    }
`;
