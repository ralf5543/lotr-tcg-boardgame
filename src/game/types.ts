export type CardKind = 'FREE_PEOPLES' | 'SHADOW';
export type CardKeyword = 'ARCHER' | 'RANGER' | 'KNIGHT' | 'DAMAGE';
export type CardSignet = 'ARAGORN' | 'FRODO' | 'GANDALF' | 'THEODEN';
export type CardSubtype =
    | 'COMPANION'
    | 'MINION'
    | 'EVENT'
    | 'CONDITION'
    | 'POSSESSION'
    | 'SITE'
    | 'ARTIFACT';
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
    | 'WRAITH'
    | 'SAURON'
    | 'ISENGARD'
    | 'ROHAN'
    | 'DUNLAND'
    | 'ORC'
    | 'GOLLUM'
    | 'MEN'
    | 'URUK-HAI'
    | 'THE-ONE-RING';

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
}

export interface GameState {
    twilightPool: number;
    currentSite: number;
    battlefield: CardType[]; // La zone centrale partagée (Sbires en bazar / Événements)
    // Un dictionnaire où la clé "0" ou "1" correspond à l'état du joueur
    players: Record<string, PlayerState>;
}
