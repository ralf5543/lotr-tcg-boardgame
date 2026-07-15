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
    activeTargetId: string | null; // L'ID du compagnon survolé
    startDrag: (card: CardType, index: number, e: React.PointerEvent) => void;
    stopDrag: () => void;
    registerTarget: (id: string, element: HTMLDivElement | null) => void;
    rotation: number;
}

const DragContext = createContext<DragContextType | undefined>(undefined);

export const DragProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [dragged, setDragged] = useState<DraggedCardData | null>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
    const [rotation, setRotation] = useState(0);
    const lastX = useRef(0); // Pour stocker la position précédente de la souris

    // Références vers les éléments DOM des compagnons cibles pour calculer les collisions
    const targetsRef = useRef<Map<string, HTMLDivElement>>(new Map());
    const activeTargetIdRef = useRef<string | null>(null);

    // Offset pour que le curseur reste pile là où on a cliqué sur la carte
    const dragOffset = useRef({ x: 0, y: 0 });

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
        // On récupère la position du clic par rapport au coin supérieur gauche de la carte
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        dragOffset.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };

        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

        // Initialisation de la position de la souris pour éviter un saut angulaire au départ
        lastX.current = e.clientX;

        setDragged({ card, index, origin: 'HAND' });
        setPosition({ x: e.clientX, y: e.clientY });
    };

    const stopDrag = () => {
        setDragged(null);
        setActiveTargetId(null);
        setRotation(0);
    };

    // Suivi de la souris et calcul de collision
    useEffect(() => {
        if (!dragged) return;

        const handlePointerMove = (e: PointerEvent) => {
            const newX = e.clientX;
            const newY = e.clientY;
            setPosition({ x: newX, y: newY });

            // --- CALCUL DE L'INCLINAISON PHYSIQUE ---
            const deltaX = newX - lastX.current;
            lastX.current = newX;

            const targetRotation = Math.max(-8, Math.min(8, deltaX * 0.4));
            setRotation((prev) => prev + (targetRotation - prev) * 0.15);

            // --- CALCUL DE COLLISION ---
            const cardWidth = 140; 
            const cardHeight = 200;
            const cardLeft = newX - dragOffset.current.x;
            const cardTop = newY - dragOffset.current.y;
            const cardRight = cardLeft + cardWidth;
            const cardBottom = cardTop + cardHeight;

            let hitCompanionId: string | null = null;
            let hitZoneId: string | null = null;

            targetsRef.current.forEach((targetEl, id) => {
                const targetRect = targetEl.getBoundingClientRect();

                // Formule de collision AABB
                const xOverlap = Math.max(
                    0,
                    Math.min(cardRight, targetRect.right) -
                        Math.max(cardLeft, targetRect.left)
                );
                const yOverlap = Math.max(
                    0,
                    Math.min(cardBottom, targetRect.bottom) -
                        Math.max(cardTop, targetRect.top)
                );
                const overlapArea = xOverlap * yOverlap;

                if (overlapArea > 0) {
                    if (id === 'freePeoplesArea') {
                        hitZoneId = id;
                    } else {
                        // Pour un compagnon individuel, on baisse le seuil à 10% pour maximiser la réactivité
                        const targetArea = targetRect.width * targetRect.height;
                        if (overlapArea > targetArea * 0.1) {
                            hitCompanionId = id;
                        }
                    }
                }
            });

            // PRIORITÉ HIERARCHIQUE : On choisit le compagnon ciblé en priorité absolue sur la zone globale
            const detectedTargetId = hitCompanionId || hitZoneId || null;

            setActiveTargetId(detectedTargetId);
            activeTargetIdRef.current = detectedTargetId;
        };

        const handlePointerUp = (e: PointerEvent) => {
            if (dragged) {
                // CALCUL DE COLLISION FLASH AU RELÂCHEMENT (Avec système de priorité)
                const cardWidth = 140;
                const cardHeight = 200;
                const cardLeft = e.clientX - dragOffset.current.x;
                const cardTop = e.clientY - dragOffset.current.y;
                const cardRight = cardLeft + cardWidth;
                const cardBottom = cardTop + cardHeight;

                let hitCompanionId: string | null = null;
                let hitZoneId: string | null = null;

                targetsRef.current.forEach((targetEl, id) => {
                    const targetRect = targetEl.getBoundingClientRect();
                    const xOverlap = Math.max(0, Math.min(cardRight, targetRect.right) - Math.max(cardLeft, targetRect.left));
                    const yOverlap = Math.max(0, Math.min(cardBottom, targetRect.bottom) - Math.max(cardTop, targetRect.top));
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

                console.log("DROP DÉTECTÉ sur la cible finale :", targetToUse);

                const dropEvent = new CustomEvent('card-dropped', {
                    detail: {
                        draggedCard: dragged,
                        targetId: targetToUse
                    }
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
    if (!context)
        throw new Error('useDrag doit être utilisé dans un DragProvider');
    return context;
};

// --- LE COMPOSANT PORTAIL VISUEL ---
const DragPortal: React.FC = () => {
    const { dragged, position, rotation } = useDrag();
    if (!dragged) return null;

    return (
        <div
            style={{
                position: 'fixed',
                left: position.x,
                top: position.y,
                transform: `translate(-50%, -50%) scale(1.1) rotate(${rotation}deg)`,
                pointerEvents: 'none',
                zIndex: 9999,
                opacity: 1,
                filter: 'drop-shadow(0 15px 25px rgba(0,0,0,0.4))',
            }}
        >
            <Card card={dragged.card} size="md" />
        </div>
    );
};