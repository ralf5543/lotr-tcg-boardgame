export type CardKind = 'FREE_PEOPLES' | 'SHADOW';

export type CardKeyword =
    | 'AID'
    | 'AMBUSH'
    | 'ARCHER'
    | 'BATTLEGROUND'
    | 'BESIEGER'
    | 'CORSAIR'
    | 'DAMAGE'
    | 'DEFENDER'
    | 'DWELLING'
    | 'EASTERLING'
    | 'ENDURING'
    | 'ENGINE'
    | 'FIERCE'
    | 'FOREST'
    | 'FORTIFICATION'
    | 'HUNTER'
    | 'KNIGHT'
    | 'LURKER'
    | 'MACHINE'
    | 'MARSH'
    | 'MOUNTAIN'
    | 'MUSTER'
    | 'PIPEWEED'
    | 'PLAINS'
    | 'RANGER'
    | 'RING-BEARER'
    | 'RING-BOUND'
    | 'RIVER'
    | 'SEARCH'
    | 'SOUTHRON'
    | 'SPELL'
    | 'STEALTH'
    | 'TALE'
    | 'TENTACLE'
    | 'TOIL'
    | 'TRACKER'
    | 'TWILIGHT'
    | 'UNDERGROUND'
    | 'UNHASTY'
    | 'VALIANT'
    | 'VILLAGER'
    | 'WARG-RIDER'
    | 'WEATHER';

export type CardSignet = 'ARAGORN' | 'FRODO' | 'GANDALF' | 'THEODEN';

export type CardType =
    | 'ALLY'
    | 'ARTIFACT_CHARACTER'
    | 'ARTIFACT_SUPPORT'
    | 'COMPANION'
    | 'CONDITION_CHARACTER'
    | 'CONDITION_SUPPORT'
    | 'EVENT'
    | 'FOLLOWER'
    | 'MINION'
    | 'POSSESSION_CHARACTER'
    | 'POSSESSION_SUPPORT';

export type CardSubtype =
    | 'ARMOR'
    | 'BOX'
    | 'BROOCH'
    | 'BRACERS'
    | 'CLOAK'
    | 'EVENT'
    | 'GAUNTLETS'
    | 'HAND-WEAPON'
    | 'HELM'
    | 'MOUNT'
    | 'PALANTIR'
    | 'PHIAL'
    | 'PIPE'
    | 'RANGED-WEAPON'
    | 'RING'
    | 'SHIELD'
    | 'STAFF';

export type CardRace =
    | 'BALROG'
    | 'CREATURE'
    | 'DWARF'
    | 'ELF'
    | 'ENT'
    | 'HOBBIT'
    | 'MAIA'
    | 'MAN'
    | 'NAZGUL'
    | 'ORC'
    | 'SPIDER'
    | 'TROLL'
    | 'URUK-HAI'
    | 'WIZARD'
    | 'WRAITH';

export type CardCulture =
    | 'DUNLAND'
    | 'DWARVEN'
    | 'ELVEN'
    | 'GANDALF'
    | 'GOLLUM'
    | 'GONDOR'
    | 'ISENGARD'
    | 'MEN'
    | 'MORIA'
    | 'ORC'
    | 'RAIDER'
    | 'RINGWRAITH'
    | 'ROHAN'
    | 'SAURON'
    | 'SHIRE'
    | 'THE-ONE-RING'
    | 'URUK-HAI';

export interface CardState {
    id: string;
    title: string;
    subtitle?: string;
    imageUrl?: string;
    kind: CardKind;
    keywords?: CardKeyword[];
    race?: CardRace;
    twilightCost: number;
    strength?: number;
    vitality?: number;
    resistance?: number;
    roaming?: number;
    signet?: CardSignet;
    culture: CardCulture;
    type: CardType;
    subtype?: CardSubtype;
    isUnique: boolean;
    gameText: string;
    loreText?: string;
    attachments?: CardState[];
    name?: string;
}

export interface PlayerProfile {
    name: string;
    avatar: string;
    faction: 'freePeoples' | 'shadow';
}

export interface PlayerState {
    profile: PlayerProfile;
    deck: CardState[];
    hand: CardState[];
    discard: CardState[];
    fellowshipArea: CardState[];
    supportArea: CardState[];
    currentSiteIndex: number;
    sitesDeck: SiteCardState[];
}

export interface SiteCardState {
    id: string;
    name: string;
    twilightCost: number;
    text: string;
    ownerId: string;
    imageUrl?: string;
    keywords?: CardKeyword[];
}

export interface GameState {
    twilightPool: number;
    currentSiteIndex: number;
    movesThisTurn: number;
    path: (SiteCardState | null)[];
    battlefield: CardState[];
    players: Record<string, PlayerState>;
    awaitingSiteSelection: boolean;
    statusMessage: string;
    actionWindow?: ActionWindow;
}

export interface KeywordData {
    label: string;
    description: string;
}

export interface ActionWindow {
    isOpen: boolean;
    title?: string;
    message?: string;
    activePlayerId: string; // Ex: '0' ou '1'
    passedPlayers: string[]; // Tableau pour suivre qui a fait "Passer" (ex: ['0'])
    canPass?: boolean;       // Permet de choisir si le bouton "Passer" est affiché
}