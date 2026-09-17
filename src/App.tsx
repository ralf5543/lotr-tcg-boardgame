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
import { TargetingProvider } from './contexts/TargetingContext';
import { audioService } from './services/audioService';

const LotrClient = Client({
    game: LotrGame,
    board: GameBoard,
    numPlayers: 2,
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

    // GESTION GLOBALE DES SONS DE CLIC SUR TOUS LES BOUTONS
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
                url.searchParams.set('match', event.data.matchId);
                window.location.href = url.toString();
            }
        };

        syncChannel.addEventListener('message', handleSync);
        return () => syncChannel.removeEventListener('message', handleSync);
    }, []);

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

    if (!myPlayerId) {
        return <div>Chargement de la session du joueur...</div>;
    }

    return (
        <ScreenViewport>
            <FactionProvider myPlayerId={myPlayerId}>
                <HoverCardProvider>
                    <DragProvider>
                        <TargetingProvider>
                            <ScaledView ref={containerRef} $scale={scale}>
                                <LotrClient
                                    matchID={currentMatchId}
                                    playerID={myPlayerId}
                                />
                            </ScaledView>
                        </TargetingProvider>
                        {/* Le curseur reste ici en dehors de ScaledView */}
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
    overflow: hidden;

    & > div {
        height: 100%;
    }
`;
