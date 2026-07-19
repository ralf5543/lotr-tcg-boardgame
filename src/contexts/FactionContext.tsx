import React, { createContext, useContext } from 'react';

export type FactionType = 'FREE_PEOPLES' | 'SHADOW';

interface FactionContextType {
    playerFaction: FactionType;
    isMyTurn: boolean;
}

const FactionContext = createContext<FactionContextType | undefined>(undefined);

export const FactionProvider: React.FC<{ 
    children: React.ReactNode; 
    currentPlayer: string; 
    myPlayerId: string; // "0", "1", "2" etc.
}> = ({ children, currentPlayer, myPlayerId }) => {
    
    // Pour l'instant, on garde ta règle : le joueur '1' est l'Ombre, le '0' est FP.
    // Plus tard, ce sera basé sur le rôle affecté au joueur dans le salon !
    const playerFaction: FactionType = myPlayerId === '1' ? 'SHADOW' : 'FREE_PEOPLES';
    
    // Est-ce que l'écran actuel correspond au joueur qui doit jouer ?
    const isMyTurn = currentPlayer === myPlayerId;
    console.log('currentPlayer : ', currentPlayer);

    return (
        <FactionContext.Provider value={{ playerFaction, isMyTurn }}>
            {children}
        </FactionContext.Provider>
    );
};

export const useFaction = () => {
    const context = useContext(FactionContext);
    if (!context) throw new Error('useFaction doit être utilisé dans un FactionProvider');
    return context;
};