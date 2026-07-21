import styled from 'styled-components';

export const AreaContainer = styled.div<{ $isOpponent?: boolean }>`
  margin-bottom: 20px;
  opacity: ${props => (props.$isOpponent ? 0.7 : 1)};
`;

export const MetaInfo = styled.span<{ $isOpponent?: boolean }>`
  display: block;
  font-size: 12px;
  color: ${props => (props.$isOpponent ? '#e74c3c' : '#3498db')};
  margin-bottom: 8px;
`;

export const Fellowship = styled.div<{ $borderColor: string }>`
  border: 2px solid ${props => props.$borderColor};
  background-color: #1a252f;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
`;

export const FellowshipCollapsed = styled.div<{ $borderColor: string }>`
  border: 2px solid ${props => props.$borderColor};
  background-color: #1a252f;
  border-radius: 6px;
  padding: 10px;
  margin-bottom: 10px;
`;

export const SupportArea = styled.div<{ $borderColor: string }>`
  border: 2px solid ${props => props.$borderColor};
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
  margin-bottom: 8px;
  color: ${props => props.color || '#fff'};
`;

export const CardRow = styled.div`
  display: flex;
  container-type: inline-size;
  gap: clamp(24px, 4cqw, 60px);
  min-height: 80px;
`;


export const MaskedZonePlaceholder = styled.div`
  padding: 15px;
  background-color: #34495e;
  border-radius: 6px;
  text-align: center;
  color: #bdc3c7;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

export const EmptyText = styled.p`
  color: #7f8c8d;
  font-style: italic;
  font-size: 12px;
  margin: 0;
`;

export const CharacterStack = styled.div`
    display: flex;
    flex-direction: column;
    position: relative;
    align-items: center;
    width: 130px;
    flex: 1 1 120px;
    max-width: 150px;
    min-width: 70px;
`;

export const AttachmentWrapper = styled.div<{ $index: number }>`
    position: absolute;
    /* On décale chaque carte attachée vers le bas */
    top: ${(props) => 45 + props.$index * 35}px;
    transform: translateX(${(props) => -1 * (props.$index + 1)}em);

    z-index: ${(props) => props.$index + 1};
    transition: transform 0.2s, z-index 0.2s;

    &:hover {
        transform: scale(1) translateY(5px);
        z-index: 999; /* Passe au-dessus au survol pour pouvoir la lire ! */
    }
`;