import React, { useEffect, useState } from 'react';
import styled from 'styled-components';

interface GameNotificationsProps {
    statusMessage: string; // Message permanent (ex: G.statusMessage)
    activePlayerId: string;
    isMyTurn: boolean;
    awaitingSite: boolean;
}

export const GameNotifications: React.FC<GameNotificationsProps> = ({
    statusMessage,
    isMyTurn,
    awaitingSite,
}) => {
    const [toast, setToast] = useState<string | null>(null);

    // Déclenche un Toast dynamique quand un événement important survient
    useEffect(() => {
        if (awaitingSite && isMyTurn) {
            setToast("⚠️ Veuillez choisir et poser un site sur la case inexplorée !");
        }
    }, [awaitingSite, isMyTurn]);

    return (
        <NotificationContainer>
            {/* 1. Bannière de statut permanent (centre haut) */}
            <StatusBanner>
                <span style={{ color: '#e2c044', marginRight: '8px' }}>📜</span>
                {statusMessage}
            </StatusBanner>

            {/* 2. Toaster d'action éphémère / Alerte active */}
            {toast && (
                <ToastItem onClick={() => setToast(null)}>
                    <span>{toast}</span>
                    <small style={{ marginLeft: '12px', opacity: 0.8 }}>(Cliquez pour fermer)</small>
                </ToastItem>
            )}
        </NotificationContainer>
    );
};

const NotificationContainer = styled.div`
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    z-index: 1000;
    pointer-events: none;
`;

const StatusBanner = styled.div`
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid #e2c044;
    color: #f1f5f9;
    padding: 6px 18px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 600;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    pointer-events: auto;
`;

const ToastItem = styled.div`
    background: #7c2d12;
    border: 1px solid #f97316;
    color: #ffedd5;
    padding: 10px 16px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: bold;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.6);
    cursor: pointer;
    animation: slideDown 0.3s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    pointer-events: auto;

    @keyframes slideDown {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
    }
`;