import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useRef,
} from 'react';
import type { CardType } from '../game/types';
import { Card } from '../views/GameBoard/components/Card';

interface DraggedCardData {
    card: CardType;
    index: number;
    origin: 'HAND' | 'BOARD';
}

interface DragContextType {
    dragged: DraggedCardData | null;
    position: { x: number; y: number };
    activeTargetId: string | null;
    startDrag: (card: CardType, index: number, e: React.PointerEvent) => void;
    stopDrag: () => void;
    registerTarget: (id: string, element: HTMLDivElement | null) => void;
    rotation: number;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

// Configuration des icônes de drag selon la faction
const GRABBING_ICONS = {
  FREE_PEOPLES: '/interface/cursor_grab.png',
  SHADOW: '/cursors/sauron_default.png',
};

const getXScale = () => {
    const scaledBoard = document.querySelector('[class*="ScaledView"]');
    if (!scaledBoard) return 1;
    const rect = scaledBoard.getBoundingClientRect();
    return rect.width / 1920; 
};

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [dragged, setDragged] = useState<DraggedCardData | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
    const [rotation, setRotation] = useState(0);
    const lastX = useRef(0);

    const targetsRef = useRef<Map<string, HTMLDivElement>>(new Map());
    const activeTargetIdRef = useRef<string | null>(null);
    const currentScale = useRef(1);
    const dragOffset = useRef({ x: 0, y: 0 });

    // --- EFFET POUR MASQUER LE CURSEUR SYSTÈME PENDANT LE DRAG ---
    useEffect(() => {
    if (dragged) {
        document.body.classList.add('is-dragging');
    } else {
        document.body.classList.remove('is-dragging');
    }
    return () => {
        document.body.classList.remove('is-dragging');
    };
}, [dragged]);

    const registerTarget = (id: string, element: HTMLDivElement | null) => {
        if (element) {
            targetsRef.current.set(id, element);
        } else {
            targetsRef.current.delete(id);
        }
    };

    const startDrag = (
        card: CardType,
        index: number,
        e: React.PointerEvent
    ) => {
        e.preventDefault();
        
        const scale = getXScale();
        currentScale.current = scale;

        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const board = document.querySelector('[class*="ScaledView"]')?.getBoundingClientRect();
        const boardLeft = board ? board.left : 0;
        const boardTop = board ? board.top : 0;

        dragOffset.current = {
            x: (e.clientX - rect.left) / scale,
            y: (e.clientY - rect.top) / scale,
        };

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        lastX.current = e.clientX;

        setDragged({ card, index, origin: 'HAND' });
        
        setPosition({ 
            x: (e.clientX - boardLeft) / scale, 
            y: (e.clientY - boardTop) / scale 
        });
    };

    const stopDrag = () => {
        setDragged(null);
        setActiveTargetId(null);
        setRotation(0);
    };

    useEffect(() => {
        if (!dragged) return;

        const handlePointerMove = (e: PointerEvent) => {
            const board = document.querySelector('[class*="ScaledView"]')?.getBoundingClientRect();
            const boardLeft = board ? board.left : 0;
            const boardTop = board ? board.top : 0;
            const scale = currentScale.current;

            const virtualX = (e.clientX - boardLeft) / scale;
            const virtualY = (e.clientY - boardTop) / scale;
            
            setPosition({ x: virtualX, y: virtualY });

            const deltaX = e.clientX - lastX.current;
            lastX.current = e.clientX;
            const targetRotation = Math.max(-8, Math.min(8, deltaX * 0.4));
            setRotation((prev) => prev + (targetRotation - prev) * 0.15);

            const cardWidthPhys = 140 * scale; 
            const cardHeightPhys = 200 * scale;
            const cardLeftPhys = e.clientX - (dragOffset.current.x * scale);
            const cardTopPhys = e.clientY - (dragOffset.current.y * scale);
            
            const cardRightPhys = cardLeftPhys + cardWidthPhys;
            const cardBottomPhys = cardTopPhys + cardHeightPhys;

            let hitCompanionId: string | null = null;
            let hitZoneId: string | null = null;

            targetsRef.current.forEach((targetEl, id) => {
                const targetRect = targetEl.getBoundingClientRect();

                const xOverlap = Math.max(0, Math.min(cardRightPhys, targetRect.right) - Math.max(cardLeftPhys, targetRect.left));
                const yOverlap = Math.max(0, Math.min(cardBottomPhys, targetRect.bottom) - Math.max(cardTopPhys, targetRect.top));
                const overlapArea = xOverlap * yOverlap;

                if (overlapArea > 0) {
                    if (id === 'freePeoplesArea') {
                        hitZoneId = id;
                    } else {
                        const targetArea = targetRect.width * targetRect.height;
                        if (overlapArea > targetArea * 0.1) {
                            hitCompanionId = id;
                        }
                    }
                }
            });

            const detectedTargetId = hitCompanionId || hitZoneId || null;
            setActiveTargetId(detectedTargetId);
            activeTargetIdRef.current = detectedTargetId;
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (dragged) {
                const scale = currentScale.current;
                const cardWidthPhys = 140 * scale;
                const cardHeightPhys = 200 * scale;
                const cardLeftPhys = e.clientX - (dragOffset.current.x * scale);
                const cardTopPhys = e.clientY - (dragOffset.current.y * scale);
                const cardRightPhys = cardLeftPhys + cardWidthPhys;
                const cardBottomPhys = cardTopPhys + cardHeightPhys;

                let hitCompanionId: string | null = null;
                let hitZoneId: string | null = null;

                targetsRef.current.forEach((targetEl, id) => {
                    const targetRect = targetEl.getBoundingClientRect();
                    const xOverlap = Math.max(0, Math.min(cardRightPhys, targetRect.right) - Math.max(cardLeftPhys, targetRect.left));
                    const yOverlap = Math.max(0, Math.min(cardBottomPhys, targetRect.bottom) - Math.max(cardTopPhys, targetRect.top));
                    const overlapArea = xOverlap * yOverlap;

                    if (overlapArea > 0) {
                        if (id === 'freePeoplesArea') {
                            hitZoneId = id;
                        } else {
                            const targetArea = targetRect.width * targetRect.height;
                            if (overlapArea > targetArea * 0.1) {
                                hitCompanionId = id;
                            }
                        }
                    }
                });

                const finalTargetId = hitCompanionId || hitZoneId || null;
                const targetToUse = finalTargetId || activeTargetIdRef.current;

                const dropEvent = new CustomEvent('card-dropped', {
                    detail: { draggedCard: dragged, targetId: targetToUse }
                });
                window.dispatchEvent(dropEvent);
            }
            activeTargetIdRef.current = null;
            stopDrag();
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, [dragged]);

    return (
        <DragContext.Provider
            value={{
                dragged,
                position,
                rotation,
                activeTargetId,
                startDrag,
                stopDrag,
                registerTarget,
            }}
        >
            {children}
            {dragged && <DragPortal />}
        </DragContext.Provider>
    );
};

export const useDrag = () => {
    const context = useContext(DragContext);
    if (!context) throw new Error('useDrag doit être utilisé dans un DragProvider');
    return context;
};

// --- LE COMPOSANT PORTAIL VISUEL MIS À JOUR ---
const DragPortal: React.FC = () => {
    const { dragged, position, rotation } = useDrag();
    if (!dragged) return null;

    // Faction temporaire fixe pour tes tests (à lier à ton state plus tard)
    const currentFaction: 'FREE_PEOPLES' | 'SHADOW' = 'FREE_PEOPLES';

    return (
        <div
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                // Au lieu de -50% -50%, la carte reste calée naturellement, 
                // et la rotation pivote autour du curseur
                transform: `rotate(${rotation}deg)`, 
                pointerEvents: 'none',
                zIndex: 9999,
                opacity: 0.95,
                filter: 'drop-shadow(4px 4px 4px rgba(0, 0, 0, 0.5)) drop-shadow(0 15px 25px rgba(0, 0, 0, 0.3))',
            }}
        >
            {/* LA MAIN FERMÉE : Ancrée pile au point (0,0) du conteneur, là où est la souris */}
            <img 
              src={GRABBING_ICONS[currentFaction]} 
              alt="Grabbing"
              style={{
                position: 'absolute',
                width: '50px',
                height: '50px',
                top: '-25px', 
                left: '-25px',
                zIndex: 10,
              }}
            />

            {/* Ta carte de jeu */}
            <div style={{
                transform: `translate(${-dragged.cardOffset?.x || -70}px, ${-dragged.cardOffset?.y || -100}px)`
            }}>
                <Card card={dragged.card} size="md" />
            </div>
        </div>
    );
};