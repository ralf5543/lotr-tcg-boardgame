import { useEffect, useRef, useState } from 'react';
import styled from 'styled-components';
import { useFaction } from '../../../../contexts/FactionContext';

type CursorState = 'DEFAULT' | 'HOVER';

export function CustomAssetCursor() {
    const { playerFaction } = useFaction();
    const [cursorState, setCursorState] = useState<CursorState>('DEFAULT');
    
    const roundedRef = useRef<HTMLDivElement>(null);
    const pointedRef = useRef<HTMLDivElement>(null);

    // 1. Détection du survol (uniquement pour la main ouverte)
    useEffect(() => {
        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const isDraggableCard = target.closest('[data-draggable="true"]');

            if (isDraggableCard) {
                setCursorState('HOVER');     // Main ouverte
            } else {
                setCursorState('DEFAULT');   // Flèche par défaut
            }
        };

        window.addEventListener('mouseover', handleMouseOver);
        return () => window.removeEventListener('mouseover', handleMouseOver);
    }, []);

    // 2. Suivi fluide de la souris (Pointermove pour éviter les blocages de capture)
    useEffect(() => {
        const moveCursor = (e: PointerEvent) => {
            const mouseX = e.clientX;
            const mouseY = e.clientY;

            if (roundedRef.current) {
                roundedRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
            }
            if (pointedRef.current) {
                pointedRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
            }
        };

        window.addEventListener('pointermove', moveCursor);
        return () => window.removeEventListener('pointermove', moveCursor);
    }, []);
    console.log("Faction actuelle dans le curseur :", playerFaction);
    const factionSuffix = playerFaction === 'SHADOW' ? 'shadow' : 'FP';

    return (
        <>
            {/* Le gros curseur avec les trois images dedans, pilotées par le CSS */}
            <CursorImageWrapper ref={roundedRef} $displaySize={40} $state={cursorState} $playerFaction={playerFaction}>
                <img className="cursor-arrow" src={`/interface/cursor_default_${factionSuffix}.webp`} alt="Cursor Arrow" />
                <img className="cursor-open" src={`/interface/cursor_pointer_${factionSuffix}.webp`} alt="Cursor Open" />
                <img className="cursor-closed" src={`/interface/cursor_grab_${factionSuffix}.webp`} alt="Cursor Closed" />
            </CursorImageWrapper>

            {/* Le point central de précision ultra-net */}
            <CursorPointed ref={pointedRef} />
        </>
    );
}

// --- STYLES ---

interface WrapperProps {
    $displaySize: number;
    $state: CursorState;
    $playerFaction: 'FREE_PEOPLES' | 'SHADOW';
}

const CursorImageWrapper = styled.div<WrapperProps>`
    position: fixed;
    pointer-events: none;
    z-index: 100000;
    width: ${props => props.$displaySize}px;
    height: ${props => props.$displaySize}px;
    margin-left: -${props => props.$displaySize / 2}px;
    margin-top: -${props => props.$displaySize / 2}px;

    filter: ${(props) =>
        props.$playerFaction === 'FREE_PEOPLES'
            ? 'drop-shadow(-2px 4px 2px rgba(0, 0, 0, 1))'
            : 'drop-shadow(0px 0px 2px red) drop-shadow(-2px 4px 2px rgba(0, 0, 0, 1))'};

    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: none;
    }

    /* --- GESTION DYNAMIQUE DU HOTSPOT --- */

    /* 
       On définit les coordonnées (top/left) de l'ancrage
       selon l'état du curseur 
    */
    top: ${props => {
        if (props.$state === 'DEFAULT') return '18px'; // Default
        if (props.$state === 'HOVER') return '19px';    // Pointer
        return '0px'; 
    }};

    left: ${props => {
        if (props.$state === 'DEFAULT') return '17px'; // Default
        if (props.$state === 'HOVER') return '2px';    // Pointer
        return '0px';
    }};
    
    & .cursor-arrow {
        display: ${props => props.$state === 'DEFAULT' ? 'block' : 'none'};
    }

    & .cursor-open {
        display: ${props => props.$state === 'HOVER' ? 'block' : 'none'};
    }

    /* Grab cursor */
    body.is-dragging & {
        top: 15px !important;  
        left: -2px !important;
        
        & .cursor-arrow, & .cursor-open {
            display: none !important;
        }
        & .cursor-closed {
            display: block !important;
        }
    }
`;

const CursorPointed = styled.div`
/* Made for testing cursors image position (remove display none) */
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 4px;
    height: 4px;
    background-color: red;
    border-radius: 50%;
    pointer-events: none;
    z-index: 100001;
    margin-left: -2px;
    margin-top: -2px;
`;