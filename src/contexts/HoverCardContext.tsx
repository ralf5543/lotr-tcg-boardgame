import React, { createContext, useContext, useState, ReactNode } from 'react';

// Orientation visuelle souhaitée pour le zoom
export type CardOrientation = 'portrait' | 'landscape';

// Structure flexible pour le contenu du zoom :
// accepte n'importe quelle carte ou un objet minimal avec au moins ce qu'il faut pour afficher
export interface HoveredCardData {
    card: any; // Accepte n'importe quel objet carte (Free Peoples, Shadow, Site...)
    orientation?: CardOrientation;
}

interface HoverCardContextType {
    hoveredData: HoveredCardData | null;
    // On permet de passer soit juste la carte (portrait par défaut), soit un objet { card, orientation }
    setHoveredCard: (card: any | null, orientation?: CardOrientation) => void;
}

const HoverCardContext = createContext<HoverCardContextType | undefined>(undefined);

export const HoverCardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [hoveredData, setHoveredData] = useState<HoveredCardData | null>(null);

    const setHoveredCard = (card: any | null, orientation: CardOrientation = 'portrait') => {
        if (!card) {
            setHoveredData(null);
        } else {
            setHoveredData({ card, orientation });
        }
    };

    return (
        <HoverCardContext.Provider value={{ hoveredData, setHoveredCard }}>
            {children}
        </HoverCardContext.Provider>
    );
};

export const useHoverCard = () => {
    const context = useContext(HoverCardContext);
    if (!context) {
        throw new Error('useHoverCard doit être utilisé à l\'intérieur de HoverCardProvider');
    }
    return context;
};