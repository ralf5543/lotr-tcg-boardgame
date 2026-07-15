import styled from 'styled-components';

export const BoardContainer = styled.div`
    position: relative;
    padding: 20px;
    background-image: url('interface/map_big.webp');
    background-size: cover;
    background-repeat: no-repeat;
    color: #fff;
    min-height: 100vh;
    padding-bottom: 180px; /* Évite que la main fixe ne cache le plateau */
`;

export const OpponentSection = styled.div`
    opacity: 0.7;
    margin-bottom: 20px;
`;

export const OpponentMeta = styled.span`
    font-size: 12px;
    color: #e74c3c;
`;

export const CentralBlock = styled.div`
    display: flex;
    gap: 20px;
    margin-bottom: 20px;
    height: 280px;
`;

export const BattlefieldContainer = styled.div`
    flex: 0 0 80%;
    background-color: #2c3e50;
    border-radius: 8px;
    border: 2px solid #7f8c8d;
    padding: 15px;
    position: relative; /* Requis pour la réserve de jetons absolue */
    display: flex;
    flex-direction: column;
`;

export const TokenReserve = styled.div`
    position: absolute;
    top: 15px;
    right: 15px;
    background-color: #34495e;
    border: 2px dashed #f1c40f;
    border-radius: 6px;
    padding: 8px;
    font-size: 11px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
`;

export const TokenGrid = styled.div`
    display: flex;
    gap: 10px;
    margin-top: 5px;
`;

export const TokenPile = styled.div<{ color?: string }>`
    background-color: ${(props) => props.color || '#c0392b'};
    padding: 4px 8px;
    border-radius: 12px;
    font-weight: bold;
    font-size: 10px;
    cursor: pointer;
`;

export const PlayerSection = styled.div`
    margin-bottom: 20px;
`;

export const PlayerMeta = styled.span`
    font-size: 12px;
    color: #3498db;
`;

export const GameZone = styled.div<{ $borderColor: string }>`
    border: 2px solid ${(props) => props.$borderColor};
    background-color: #1a252f;
    border-radius: 6px;
    padding: 10px;
    margin-bottom: 10px;
`;

export const ZoneTitle = styled.span<{ color?: string }>`
    display: block;
    font-size: 11px;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 5px;
    color: ${(props) => props.color || '#fff'};
`;

export const CardRow = styled.div`
    display: flex;
    gap: 10px;
    min-height: 80px;
    align-items: center;
`;

export const InfoText = styled.p`
    color: #7f8c8d;
    font-style: italic;
    font-size: 12px;
    margin: 0;
`;

export const HoveredCardsZone = styled.div`
  position: fixed;
  inset-block-end: 40px;
  inset-inline-end: 5vw;
  z-index: 9999;
  pointerEvents: none;
  animation: fadeIn 0.15s ease-out
`;
