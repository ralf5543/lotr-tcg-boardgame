import { useEffect, useRef, useState } from 'react';
import styled, { css } from 'styled-components';
import { useFaction } from '../../../../contexts/FactionContext';

type CursorState = 'DEFAULT' | 'HOVER';

export function CustomAssetCursor() {
    const { playerFaction } = useFaction();
    const [cursorState, setCursorState] = useState<CursorState>('DEFAULT');
    const [isInteractive, setIsInteractive] = useState(false);
    
    const roundedRef = useRef<HTMLDivElement>(null);
    const pointedRef = useRef<HTMLDivElement>(null);

    // 1. Détection du survol (Cartes grabbables + Éléments interactifs)
    useEffect(() => {
        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target) return;

            // Détection de carte draggable (main ouverte)
            const isDraggableCard = target.closest('[data-draggable="true"]');

            // Détection de tout élément interactif (boutons, liens, sélecteurs, etc.)
            const isClickable = target.closest(
                'button, a, input, select, textarea, [role="button"], [data-interactive="true"]'
            );

            if (isDraggableCard) {
                setCursorState('HOVER'); // Main ouverte
                setIsInteractive(true);   // Activer la lumière
            } else if (isClickable) {
                setCursorState('DEFAULT'); // Garder la flèche
                setIsInteractive(true);   // Activer la lumière
            } else {
                setCursorState('DEFAULT');
                setIsInteractive(false);  // Pas de lumière
            }
        };

        window.addEventListener('mouseover', handleMouseOver);
        return () => window.removeEventListener('mouseover', handleMouseOver);
    }, []);

    // 2. Suivi fluide de la souris
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

    const factionSuffix = playerFaction === 'SHADOW' ? 'shadow' : 'FP';

    return (
        <>
            <CursorImageWrapper
                ref={roundedRef}
                $displaySize={40}
                $state={cursorState}
                $playerFaction={playerFaction}
                $isInteractive={isInteractive}
            >
                <img className="cursor-arrow" src={`/interface/cursors/cursor_default_${factionSuffix}.webp`} alt="Cursor Arrow" />
                <img className="cursor-open" src={`/interface/cursors/cursor_pointer_${factionSuffix}.webp`} alt="Cursor Open" />
                <img className="cursor-closed" src={`/interface/cursors/cursor_grab_${factionSuffix}.webp`} alt="Cursor Closed" />
            </CursorImageWrapper>

            {/* Point de test/précision */}
            <CursorPointed ref={pointedRef} />
        </>
    );
}

// --- STYLES ---

interface WrapperProps {
    $displaySize: number;
    $state: CursorState;
    $playerFaction: 'FREE_PEOPLES' | 'SHADOW';
    $isInteractive: boolean;
}

const CursorImageWrapper = styled.div<WrapperProps>`
    position: fixed;
    pointer-events: none;
    z-index: 100000;
    width: ${props => props.$displaySize}px;
    height: ${props => props.$displaySize}px;
    margin-left: -${props => props.$displaySize / 2}px;
    margin-top: -${props => props.$displaySize / 2}px;
    transition: filter 0.15s ease;

    /* OMBRE DE BASE (selon faction) */
    ${(props) =>
        props.$playerFaction === 'FREE_PEOPLES'
            ? css`
                filter: drop-shadow(-2px 4px 2px rgba(0, 0, 0, 1));
              `
            : css`
                filter: drop-shadow(-2px 4px 2px rgba(0, 0, 0, 1));
              `}

    /* 🟢 EFFET DE LUMIÈRE / SURBRILLANCE AU SURVOL INTERACTIF */
    ${(props) =>
        props.$isInteractive &&
        (props.$playerFaction === 'FREE_PEOPLES'
            ? css`
                filter: drop-shadow(0px 0px 6px rgba(226, 192, 68, 0.9))
                        drop-shadow(-2px 4px 2px rgba(0, 0, 0, 1))
                        brightness(1.15);
              `
            : css`
                filter: drop-shadow(0px 0px 2px red)
                        drop-shadow(-2px 4px 2px rgba(0, 0, 0, 1))
                        brightness(1.2);
              `)}

    img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        display: none;
    }

    /* GESTION DYNAMIQUE DU HOTSPOT */
    top: ${props => {
        if (props.$state === 'DEFAULT') return '18px';
        if (props.$state === 'HOVER') return '19px';
        return '0px'; 
    }};

    left: ${props => {
        if (props.$state === 'DEFAULT') return '17px';
        if (props.$state === 'HOVER') return '2px';
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