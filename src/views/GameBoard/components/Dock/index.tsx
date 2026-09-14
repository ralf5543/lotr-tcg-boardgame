import React, { useState, useEffect } from 'react';
import * as S from './styles';

export type ActiveTab = 'hand' | 'sites' | 'none';

interface DockProps {
    handCount: number;
    sitesCount: number;
    handView: React.ReactNode;
    sitesView: React.ReactNode;
    requestedTab?: ActiveTab | null;
}

export const Dock: React.FC<DockProps> = React.memo(
    ({ handCount, sitesCount, handView, sitesView, requestedTab }) => {
        const [activeTab, setActiveTab] = useState<ActiveTab>('hand');

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
                <S.DrawerContainer>
                    <S.TabContentWrapper key={activeTab}>
                        {activeTab === 'hand' && handView}
                        {activeTab === 'sites' && sitesView}
                    </S.TabContentWrapper>
                </S.DrawerContainer>

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
                </S.DockBar>
            </S.DockWrapper>
        );
    }
);
