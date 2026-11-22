import React, { useState, useEffect } from 'react';
import * as S from './styles';

export type ActiveTab = 'hand' | 'sites' | 'none';

interface DockProps {
    handCount: number;
    sitesCount: number;
    handView: React.ReactNode;
    sitesView: React.ReactNode;
    requestedTab?: ActiveTab | null;
    onOpenOptions?: () => void;
}

function GearIcon() {
    return (
        <S.GearIcon
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="currentColor"
        >
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.06-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96a7.2 7.2 0 0 0-1.62-.94l-.36-2.54A.49.49 0 0 0 14 2h-4a.49.49 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.64 8.48a.49.49 0 0 0 .12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94L2.76 14.5a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.3.59.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.05.24.25.42.49.42h4c.24 0 .44-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.49.49 0 0 0-.12-.61l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
        </S.GearIcon>
    );
}

export const Dock: React.FC<DockProps> = React.memo(
    ({
        handCount,
        sitesCount,
        handView,
        sitesView,
        requestedTab,
        onOpenOptions,
    }) => {
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
                    {onOpenOptions && (
                        <S.DockButton
                            type="button"
                            aria-label="Options"
                            onClick={onOpenOptions}
                        >
                            <GearIcon />
                            Options
                        </S.DockButton>
                    )}
                </S.DockBar>
            </S.DockWrapper>
        );
    }
);
