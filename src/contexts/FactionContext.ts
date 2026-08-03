import { createContext, useContext } from 'react';

export type Faction = 'FREE_PEOPLES' | 'SHADOW';

interface FactionContextType {
    currentPlayer: string;
    myPlayerId: string;
    fpPlayerId: string;
    setFpPlayerId?: (id: string) => void;
}

// Valeur par défaut de secours si le hook est appelé hors d'un Provider
const defaultContextValue: FactionContextType = {
    currentPlayer: '0',
    myPlayerId: '0',
    fpPlayerId: '0',
    setFpPlayerId: () => {},
};

export const FactionContext = createContext<FactionContextType | undefined>(undefined);

export const useFaction = () => {
    const context = useContext(FactionContext);
    
    if (!context) {
        return defaultContextValue;
    }
    
    return context;
};