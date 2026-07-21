import styled from 'styled-components';



const CURSOR_THEMES = {
  FREE_PEOPLES: {
    default: "url('/interface/cursor_default.png') 10 10",
    pointer: "url('/interface/cursor_hand.png') 15 5",
  },
  SHADOW: {
    default: "url('/cursors/sauron_default_2x.png') 0 0, url('/cursors/sauron_default.png') 0 0",
    pointer: "url('/cursors/sauron_default_2x.png') 0 0, url('/cursors/sauron_default.png') 0 0",
  }
};

export const BoardContainer = styled.div<{ $faction: 'FREE_PEOPLES' | 'SHADOW' }>`
    display: flex;
    height: 100%;
    flex-direction: column;
    position: relative;
    padding: 20px;
    background-size: cover;
    background-repeat: no-repeat;
    background-image: url('interface/map_big.webp');
    color: #fff;
    background-attachment: fixed;

    button, 
    a {
    cursor: ${props => CURSOR_THEMES[props.$faction].default}, pointer;
  }

  [draggable="true"],
  [class*="CardContainer"] {
    cursor: ${props => CURSOR_THEMES[props.$faction].pointer}, pointer;
  }
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
    flex-direction: column;
    gap: 20px;
    margin-bottom: 20px;
    height: 100%;
`;
export const MainZone = styled.div`
    display: grid;
    grid-template-columns: 20% 1fr 20%;
    height: 100%;
`;
export const PhaseBanner = styled.div`
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
    border: 1px solid #334155;
    border-radius: 8px;
    padding: 10px 16px;
    margin-bottom: 12px;
    color: #f8fafc;
    font-size: 0.9rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);

    span {
        display: flex;
        align-items: center;
        gap: 6px;
        
        strong {
            color: #38bdf8;
            font-weight: 600;
        }
    }

    button {
        background: #2563eb;
        color: #ffffff;
        border: none;
        border-radius: 6px;
        padding: 6px 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
            background: #1d4ed8;
            transform: translateY(-1px);
        }

        &:active {
            transform: translateY(0);
        }
    }
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
  width: clamp(250px, 30vw, 400px); /* Taille idéale pour un gros zoom ! */
  aspect-ratio: 1/1.39;
  inset-block-start: 50%;
  transform: translateY(-50%);
  inset-inline-end: 24px;
  z-index: 9999;
  pointerEvents: none;
  animation: fadeIn 0.15s ease-out;
  box-shadow: 5px 5px 15px 5px #000000;
`;
