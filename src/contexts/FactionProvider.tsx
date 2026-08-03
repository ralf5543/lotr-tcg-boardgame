import React, { useState } from 'react';
import { FactionContext } from './FactionContext';

interface FactionProviderProps {
    children: React.ReactNode;
    myPlayerId: string;
}

export const FactionProvider: React.FC<FactionProviderProps> = ({
    children,
    myPlayerId,
}) => {
    // 🟢 On gère uniquement le fpPlayerId dynamique
    const [fpPlayerId, setFpPlayerId] = useState<string>('0');

    return (
        <FactionContext.Provider
            value={{
                currentPlayer: '0', // Valeur fallback si requis par l'interface
                myPlayerId,
                fpPlayerId,
                setFpPlayerId,
            }}
        >
            {children}
        </FactionContext.Provider>
    );
};