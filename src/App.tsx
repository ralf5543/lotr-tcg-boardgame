import { useState, useEffect, useRef } from 'react';
import styled from 'styled-components';
import { Client } from 'boardgame.io/react';
import { LotrGame } from './game/Game';
import { GameBoard } from './views/GameBoard';
import { HoverCardProvider } from './contexts/HoverCardContext';
import { CustomAssetCursor } from './views/GameBoard/components/CustomCursor';
import { DragProvider } from './contexts/DragContext';
import { FactionProvider } from './contexts/FactionContext';

const LotrClient = Client({
    game: LotrGame,
    board: GameBoard,
    numPlayers: 2,
});

// Dimensions de référence de ton jeu
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

function App() {
    const [scale, setScale] = useState(1);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return;

            // Calcul du ratio disponible dans la fenêtre
            const scaleX = window.innerWidth / DESIGN_WIDTH;
            const scaleY = window.innerHeight / DESIGN_HEIGHT;

            // Math.min évite que le jeu ne soit rogné si la fenêtre est trop étroite ou trop basse
            setScale(Math.min(scaleX, scaleY));
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Calcul initial
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch((err) => {
                console.error(
                    `Erreur en tentant de passer en plein écran: ${err.message}`
                );
            });
        } else {
            document.exitFullscreen();
        }
    };

    return (
        <ScreenViewport>
            <FactionProvider currentPlayer="0" myPlayerId="0">
                <HoverCardProvider>
                    <DragProvider>
                        {/* Le ScaledView englobe toute ton UI et applique le zoom JPEG */}
                        <ScaledView ref={containerRef} $scale={scale}>
                            <LotrClient />
                            <FullscreenButton
                                onClick={toggleFullScreen}
                                title="Plein écran"
                            >
                                [ ⛶ ]
                            </FullscreenButton>
                        </ScaledView>
                        <CustomAssetCursor />
                    </DragProvider>
                </HoverCardProvider>
            </FactionProvider>
        </ScreenViewport>
    );
}

export default App;

// --- STYLES DU SCALE ---

// Prend 100% de la fenêtre réelle, gère le fond noir/décor et centre le jeu
const ScreenViewport = styled.div`
    width: 100vw;
    height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background-color: #0d0e12; /* Fond pour combler le vide si l'écran est trop large */
`;

// La boîte de jeu virtuelle (notre Safe Area fixe)
const ScaledView = styled.div<{ $scale: number }>`
    width: ${DESIGN_WIDTH}px;
    height: ${DESIGN_HEIGHT}px;
    position: relative;
    transform-origin: center center;
    transform: scale(${(props) => props.$scale});
    flex-shrink: 0;
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
    z-index: 10000; /* Toujours au-dessus */
    transition: all 0.2s;

    &:hover {
        background: #c1a054;
        color: #0d0e12;
    }
`;
