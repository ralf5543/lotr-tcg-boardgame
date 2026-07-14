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

export const Zone = styled.div<{ $borderColor: string }>`
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
  gap: 10px;
  min-height: 80px;
  align-items: center;
`;

const getCultureColor = (culture: string): string => {
  switch (culture) {
    case 'gondor': return '#1a365d';  // Bleu Gondor
    case 'shire': return '#2f855a';   // Vert Comté
    case 'isengard': return '#4a5568'; // Gris fer Isengard
    case 'wraith': return '#1a202c';   // Noir Nazgûl
    case 'elven': return '#319795';    // Turquoise Elfes
    case 'dwarven': return '#744210';  // Marron Nains
    case 'moria': return '#2d3748';    // Gris sombre Moria
    case 'sauron': return '#742a2a';   // Rouge sang Sauron
    default: return '#4a5568';
  }
};

export const GameCard = styled.div<{ $culture: string; $imageUrl?: string }>`
  width: 100px;
  height: 140px;
  border-radius: 6px;
  border: 3px solid ${props => getCultureColor(props.$culture)};
  background-color: #1a202c;
  
  /* On applique l'image en fond si elle existe, sinon un dégradé de la couleur de culture */
  background-image: ${props => props.$imageUrl 
    ? `url(${props.$imageUrl})` 
    : `linear-gradient(to bottom, #2d3748, ${getCultureColor(props.$culture)})`
  };
  background-size: cover;
  background-position: center;
  
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
  position: relative;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  overflow: hidden;
`;

// Un petit bandeau semi-transparent en haut pour que le titre reste lisible sur l'image
export const CardHeader = styled.div`
  background: rgba(0, 0, 0, 0.65);
  margin: -8px -8px 0 -8px;
  padding: 4px 6px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const CardTitle = styled.span`
  font-size: 10px;
  color: #fff;
  font-weight: bold;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

// Un conteneur en bas pour regrouper les stats (Force à gauche, Vitalité à droite)
export const StatsRow = styled.div`
  display: flex;
  justify-content: space-between;
  width: 100%;
`;

export const StatBadge = styled.span<{ $isStrength?: boolean }>`
  background-color: ${props => props.$isStrength ? '#e53e3e' : '#3182ce'};
  color: #fff;
  font-weight: bold;
  font-size: 11px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.5);
`;

export const CardCost = styled.span`
  font-size: 11px;
  color: #f1c40f;
  text-align: right;
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