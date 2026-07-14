export type CardKind = 'FREE_PEOPLES' | 'SHADOW';

export interface CardType {
  id: string;          // Id unique (ex: "gandalf-1")
  title: string;       // Nom de la carte
  imageUrl?: string;
  kind: CardKind;      // Bien ou Mal
  twilightCost: number; // Son coût
  strength?: number;   // Force de combat (ex: Aragorn = 8)
  vitality?: number;   // Points de vie / Vitalité (ex: Frodo = 4)
  culture: string;     // ex: 'gondor', 'shire', 'isengard', 'wraith'
  subType: 'COMPANION' | 'MINION'; // Précise le type de personnage
}

// L'état propre à chaque joueur (sa main, sa pioche, sa défausse)
export interface PlayerState {
  deck: CardType[];
  hand: CardType[];
  discard: CardType[];
  freePeoplesArea: CardType[]; // Zone exclusive des Compagnons (les gentils)
  supportArea: CardType[];     // Aire de soutien (Allies, Conditions... mixte)
}

export interface GameState {
  twilightPool: number;
  currentSite: number;
  battlefield: CardType[];     // La zone centrale partagée (Sbires en bazar / Événements)
  // Un dictionnaire où la clé "0" ou "1" correspond à l'état du joueur
  players: Record<string, PlayerState>;
}