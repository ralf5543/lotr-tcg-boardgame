import React, { useState, useEffect } from 'react';
import * as S from './styles';

export type ActiveTab = 'hand' | 'sites' | 'discard' | 'none';

interface DockProps {
    handCount: number;
    sitesCount: number;
    discardCount?: number;
    handView: React.ReactNode;
    sitesView: React.ReactNode;
    discardView?: React.ReactNode;
    requestedTab?: ActiveTab | null;
}

export const Dock: React.FC<DockProps> = React.memo(
    ({
        handCount,
        sitesCount,
        discardCount = 0,
        handView,
        sitesView,
        discardView,
        requestedTab,
    }) => {
        // State local pour savoir quel tiroir est ouvert
        const [activeTab, setActiveTab] = useState<ActiveTab>('hand');

        // 🟢 BASCULE AUTOMATIQUE EN FONCTION DU CONTEXTE DE JEU
        useEffect(() => {
            if (requestedTab) {
                setActiveTab(requestedTab);
            }
        }, [requestedTab]);

        const toggleTab = (tab: ActiveTab) => {
            setActiveTab((prev) => (prev === tab ? 'none' : tab));
        };

        return (
            <S.DockWrapper>
                {/* 1. LE TIROIR : Reste ouvert si un onglet est actif */}
                <S.DrawerContainer>
                    {/* 2. LE CONTENU */}
                    <S.TabContentWrapper key={activeTab}>
                        {activeTab === 'hand' && handView}
                        {activeTab === 'sites' && sitesView}
                        {activeTab === 'discard' &&
                            (discardView ?? <div>Cimetière vide</div>)}
                    </S.TabContentWrapper>
                </S.DrawerContainer>

                {/* 3. BARRE DE BOUTONS */}
                <S.DockBar>
                    <S.DockButton
                        $isActive={activeTab === 'hand'}
                        onClick={() => toggleTab('hand')}
                    >
                        🃏 Main ({handCount})
                    </S.DockButton>
                    <S.DockButton
                        $isActive={activeTab === 'sites'}
                        onClick={() => toggleTab('sites')}
                    >
                        🏰 Sites ({sitesCount})
                    </S.DockButton>
                    <S.DockButton
                        $isActive={activeTab === 'discard'}
                        onClick={() => toggleTab('discard')}
                    >
                        💀 Cimetière ({discardCount})
                    </S.DockButton>
                </S.DockBar>
            </S.DockWrapper>
        );
    }
);