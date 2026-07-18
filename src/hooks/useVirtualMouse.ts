import { useState, useEffect, useRef, useCallback } from 'react';

// Les mêmes dimensions que dans ton App.tsx
const DESIGN_WIDTH = 1920;
const DESIGN_HEIGHT = 1080;

export const useVirtualMouse = () => {
    const [scale, setScale] = useState(1);
    // On garde une référence à un élément qui a la taille DESIGN (ton ScaledView)
    const virtualElementRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const calculateScale = () => {
            // On calcule le scale exactement comme dans App.tsx
            const scaleX = window.innerWidth / DESIGN_WIDTH;
            const scaleY = window.innerHeight / DESIGN_HEIGHT;
            const newScale = Math.min(scaleX, scaleY);
            setScale(newScale);
        };

        window.addEventListener('resize', calculateScale);
        calculateScale(); // Calcul initial
        return () => window.removeEventListener('resize', calculateScale);
    }, []);

    // Cette fonction magique traduit les coordonnées !
    const getVirtualCoords = useCallback((clientX: number, clientY: number) => {
        if (!virtualElementRef.current) return { x: 0, y: 0 };

        // 1. On récupère la position physique réelle du conteneur zoomé à l'écran
        const rect = virtualElementRef.current.getBoundingClientRect();

        // 2. On calcule la position de la souris RELATIVE à ce conteneur
        const relativeX = clientX - rect.left;
        const relativeY = clientY - rect.top;

        // 3. On divise par le scale pour retrouver la coordonnée dans le monde virtuel
        return {
            x: relativeX / scale,
            y: relativeY / scale,
        };
    }, [scale]);

    return { getVirtualCoords, virtualElementRef, scale };
};