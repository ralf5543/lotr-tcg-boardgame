export type CardKind = 'FREE_PEOPLES' | 'SHADOW';
export type CardKeyword = 'ARCHER' | 'RANGER' | 'KNIGHT' | 'DAMAGE';
export type CardSignet = 'ARAGORN' | 'FRODO' | 'GANDALF' | 'THEODEN';
export type CardSubtype =
    | 'COMPANION'
    | 'MINION'
    | 'EVENT'
    | 'CONDITION'
    | 'POSSESSION_CHARACTER'
    | 'POSSESSION_SUPORT'
    | 'ARTIFACT_CHARACTER'
    | 'ARTIFACT_SUPPORT'
    | 'CONDITION_CHARACTER'
    | 'CONDITION_SUPPORT';

export type CardRace =
    | 'MAN'
    | 'DWARF'
    | 'ELF'
    | 'HOBBIT'
    | 'ENT'
    | 'WIZARD'
    | 'CREATURE'
    | 'BALROG'
    | 'TROLL'
    | 'ORC'
    | 'URUK-HAI'
    | 'NAZGUL';
    
export type CardCulture =
    | 'GONDOR'
    | 'DWARVEN'
    | 'ELVEN'
    | 'SHIRE'
    | 'GANDALF'
    | 'MORIA'
    | 'RINGWRAITH'
    | 'SAURON'
    | 'ISENGARD'
    | 'ROHAN'
    | 'DUNLAND'
    | 'ORC'
    | 'GOLLUM'
    | 'MEN'
    | 'URUK-HAI'
    | 'THE-ONE-RING';

export type SiteKeyword =
    | 'RIVER'
    | 'FOREST';

export interface CardType {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    kind: CardKind;
    keyword?: CardKeyword;
    race?: CardRace;
    twilightCost: number;
    strength?: number;
    vitality?: number;
    roaming?: number;
    signet?: string;
    culture: CardCulture;
    subType: CardSubtype;
    isUnique: boolean;
    gameText: string;
    loreText?: string;
    attachments?: CardType[];
}

// L'état propre à chaque joueur (sa main, sa pioche, sa défausse)
export interface PlayerState {
    deck: CardType[];
    hand: CardType[];
    discard: CardType[];
    fellowshipArea: CardType[]; // Zone exclusive des Compagnons (les gentils)
    supportArea: CardType[]; // Aire de soutien (Allies, Conditions... mixte)
    currentSiteIndex: number;
    sitesDeck: SiteCardState[];
}

export interface SiteCardState {
    id: string;
    name: string;
    twilightCost: number;
    text: string;
    ownerId: string;     // '0' ou '1' (pour se rappeler qui l'a posé)
    imageUrl?: string;
    keyword: SiteKeyword;
}

export interface GameState {
    twilightPool: number;
    currentSiteIndex: number; // Position actuelle du pion sur le chemin (0 à 8, soit site 1 à 9)
    movesThisTurn: number;    // Compteur pour limiter à 2 déplacements max par tour
    path: (SiteCardState | null)[]; // Le chemin de 9 cases horizontales
    battlefield: CardType[];
    players: Record<string, PlayerState>;
}
