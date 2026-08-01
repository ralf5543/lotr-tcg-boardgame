import { createContext, useContext } from 'react';

export type FactionType = 'FREE_PEOPLES' | 'SHADOW';

export interface FactionContextType {
    playerFaction: FactionType;
    isMyTurn: boolean;
}

export const FactionContext = createContext<FactionContextType | undefined>(undefined);

export const useFaction = (): FactionContextType => {
    const context = useContext(FactionContext);
    if (!context) {
        throw new Error('useFaction doit être utilisé dans un FactionProvider');
    }
    return context;
};