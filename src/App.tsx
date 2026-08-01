import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Client } from 'boardgame.io/react';
import { Local, SocketIO } from 'boardgame.io/multiplayer';
import { LotrGame } from './game';
import { GameBoard } from './views/GameBoard';
import { HoverCardProvider } from './contexts/HoverCardProvider';
import { CustomAssetCursor } from './views/GameBoard/components/CustomCursor';
import { DragProvider } from './contexts/DragProvider';
import { FactionProvider } from './contexts/FactionProvider';

const LotrClient = Client({
    game: LotrGame,
    board: GameBoard,
    numPlayers: 2,
    // En dev : WebSocket via le serveur local. En prod : mode Local (ou ton serveur distant)
    multiplayer: import.meta.env.DEV
        ? SocketIO({ server: `http://${window.location.hostname}:8000` })
        : Local(),
    debug: false,
});

const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

const syncChannel = new BroadcastChannel('lotr_match_sync');

function App() {
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    const [{ myPlayerId, currentMatchId }] = useState(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return {
            myPlayerId: searchParams.get('player') || '0',
            currentMatchId: searchParams.get('match') || 'default',
        };
    });
    
    

    useEffect(() => {
        const handleSync = (event: MessageEvent) => {
            if (event.data?.type === 'NEW_MATCH') {
                const url = new URL(window.location.href);
                url.searchParams.set('match', event.data.matchId);
                // On force la redirection immédiate du second onglet sur le nouveau match
                window.location.href = url.toString();
            }
        };

        syncChannel.addEventListener('message', handleSync);
        return () => syncChannel.removeEventListener('message', handleSync);
    }, []);

    // Fonction de hard-reset : crée une nouvelle partie unique sur le serveur
    const handleHardReset = () => {
        const newMatchId = 'match_' + Date.now();

        // 1. Prévenir l'autre onglet de se recharger sur la NOUVELLE URL complète
        syncChannel.postMessage({ type: 'NEW_MATCH', matchId: newMatchId });

        // 2. Rediriger l'onglet courant
        const url = new URL(window.location.href);
        url.searchParams.set('match', newMatchId);
        window.location.href = url.toString();
    };

    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return;

            const scaleX = window.innerWidth / DESIGN_WIDTH;
            const scaleY = window.innerHeight / DESIGN_HEIGHT;

            setScale(Math.min(scaleX, scaleY));
        };

        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(`Erreur plein écran: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    };
    if (!myPlayerId) {
        return <div>Chargement de la session du joueur...</div>;
    }

    console.log('--- APP RENDER CLIENT ---', { currentMatchId, myPlayerId, type: typeof myPlayerId });

    return (
        <ScreenViewport>
            <FactionProvider currentPlayer={myPlayerId} myPlayerId={myPlayerId}>
                <HoverCardProvider>
                    <DragProvider>
                        <ScaledView ref={containerRef} $scale={scale}>
                            <LotrClient
                                matchID={currentMatchId}
                                playerID={myPlayerId}// Force le type string ("0" ou "1")
                            />

                            <FullscreenButton
                                onClick={toggleFullScreen}
                                title="Plein écran"
                            >
                                [ ⛶ ]
                            </FullscreenButton>

                            <PlayerSwitcher>
                                <span>
                                    Joueur :{' '}
                                    <strong>
                                        {myPlayerId === '0'
                                            ? 'FP (0)'
                                            : 'Ombre (1)'}
                                    </strong>
                                </span>
                                <a
                                    href={`?player=0&match=${currentMatchId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Onglet FP
                                </a>
                                <a
                                    href={`?player=1&match=${currentMatchId}`}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Onglet Ombre
                                </a>

                                {/* Bouton de Hard Reset */}
                                <button onClick={handleHardReset}>
                                    Reset Partie 🔄
                                </button>
                            </PlayerSwitcher>
                        </ScaledView>

                        <CustomAssetCursor />
                    </DragProvider>
                </HoverCardProvider>
            </FactionProvider>
        </ScreenViewport>
    );
}

export default App;

// --- STYLES ---

const ScreenViewport = styled.div`
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background-color: #0d0e12;
`;

const ScaledView = styled.div<{ $scale: number }>`
    width: ${DESIGN_WIDTH}px;
    height: ${DESIGN_HEIGHT}px;
    position: relative;
    transform-origin: center center;
    transform: scale(${(props) => props.$scale});
    flex-shrink: 0;

    & > div {
        height: 100%;
    }
`;

const FullscreenButton = styled.button`
    position: absolute;
    inset-block-end: 15px;
    inset-inline-end: 15px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #c1a054;
    color: #c1a054;
    padding: 8px 12px;
    border-radius: 4px;
    z-index: 10000;
    cursor: pointer;

    &:hover {
        background: #c1a054;
        color: #0d0e12;
    }
`;

const PlayerSwitcher = styled.div`
    position: absolute;
    top: 10px;
    left: 10px;
    height: auto !important;
    background: rgba(0, 0, 0, 0.85);
    border: 1px solid #444;
    color: #fff;
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 10000;
    display: flex;
    align-items: center;
    gap: 10px;

    a {
        color: #c1a054;
        text-decoration: underline;
    }

    button {
        color: #c1a054;
        background: transparent;
        border: 1px solid #c1a054;
        padding: 2px 6px;
        border-radius: 4px;
        cursor: pointer;

        &:hover {
            background: #c1a054;
            color: #0d0e12;
        }
    }
`;
