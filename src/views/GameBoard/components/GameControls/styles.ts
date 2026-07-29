import styled, { keyframes } from 'styled-components';

export const slideDown = keyframes`
    from { transform: translate(-50%, -20px); opacity: 0; }
    to { transform: translate(-50%, 0); opacity: 1; }
`;

export const slideInRight = keyframes`
    from { transform: translateX(120%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
`;

export const ControlsContainer = styled.div`
    position: absolute;
    top: 15px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1000;
    pointer-events: auto;
    animation: ${slideDown} 0.3s ease-out;
`;

export const PhaseBanner = styled.div`
    background: rgba(13, 14, 18, 0.92);
    border: 1px solid #c1a054;
    border-radius: 12px;
    padding: 8px 16px;
    display: flex;
    align-items: center;
    gap: 20px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(8px);
`;

export const InfoGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
    border-right: 1px solid rgba(193, 160, 84, 0.3);
    padding-right: 15px;
`;

export const PhaseBadge = styled.span`
    background: rgba(193, 160, 84, 0.15);
    color: #c1a054;
    border: 1px solid rgba(193, 160, 84, 0.4);
    padding: 4px 10px;
    border-radius: 6px;
    font-size: 18px;
    font-weight: 700;
`;

export const PlayerBadge = styled.span<{ $isCurrentPlayer: boolean }>`
    color: ${(props) => (props.$isCurrentPlayer ? '#4ade80' : '#cbd5e1')};
    font-size: 12px;
    strong {
        color: #fff;
    }
`;

export const MessageText = styled.div`
    color: #f8fafc;
    font-size: 13px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;

    .icon {
        color: #c1a054;
    }
`;

export const ActionGroup = styled.div`
    display: flex;
    align-items: center;
    gap: 8px;
    border-left: 1px solid rgba(193, 160, 84, 0.3);
    padding-left: 15px;
`;

export const ActionButton = styled.button<{ $variant?: 'primary' | 'secondary' }>`
    background: ${(props) =>
        props.$variant === 'secondary'
            ? 'rgba(239, 68, 68, 0.2)'
            : 'linear-gradient(180deg, #c1a054 0%, #9a7b32 100%)'};
    color: ${(props) => (props.$variant === 'secondary' ? '#fca5a5' : '#0d0e12')};
    border: 1px solid
        ${(props) => (props.$variant === 'secondary' ? '#ef4444' : '#e2c044')};
    padding: 6px 14px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.15s ease;

    &:hover {
        transform: translateY(-1px);
        filter: brightness(1.1);
        box-shadow: 0 4px 12px rgba(193, 160, 84, 0.3);
    }

    &:active {
        transform: translateY(0);
    }
`;

export const ToastWidget = styled.div`
    position: fixed;
    bottom: 25px;
    right: 25px;
    width: 320px;
    background: rgba(15, 23, 42, 0.95);
    border: 1px solid #c1a054;
    border-left: 4px solid #e2c044;
    border-radius: 8px;
    padding: 12px 16px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
    z-index: 9999;
    cursor: pointer;
    backdrop-filter: blur(6px);
    animation: ${slideInRight} 0.35s cubic-bezier(0.16, 1, 0.3, 1);

    &:hover {
        border-color: #e2c044;
    }
`;

export const ToastHeader = styled.div`
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    font-weight: 800;
    color: #c1a054;
    letter-spacing: 1px;
    margin-bottom: 6px;
`;

export const CloseHint = styled.span`
    color: #64748b;
    font-weight: 400;
    font-size: 10px;
`;

export const ToastBody = styled.div`
    color: #f1f5f9;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.4;
`;