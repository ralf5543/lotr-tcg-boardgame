import type { FnContext } from 'boardgame.io';

export type CardKind = 'FREE_PEOPLES' | 'SHADOW' | 'NONE';

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
    | 'POSSESSION_SUPPORT'
    | 'THE-ONE-RING';

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
    | 'STAFF'
    | 'THE-ONE-RING';

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
    twilightCost?: number;
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
    wounds?: number;
    isStartingMember?: boolean;
    isFaceDown?: boolean;
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
    deadPile: CardState[];
    fellowshipArea: CardState[];
    supportArea: CardState[];
    currentSiteIndex: number;
    sitesDeck: SiteCardState[];
}

export interface SiteCardState {
    siteNumber?: number;
    id: string;
    name: string;
    twilightCost: number;
    gameText: string;
    ownerId: string;
    imageUrl?: string;
    keywords?: CardKeyword[];
}

export interface GameState {
    fpPlayerId: string;
    twilightPool: number;
    currentSiteIndex?: number;
    currentSite?: number;
    movesThisTurn?: number;
    path: (SiteCardState | null)[];
    battlefield: CardState[];
    players: Record<string, PlayerState>;
    awaitingSiteSelection: boolean;
    statusMessage: string;
    activeSkirmishId?: string;
    actionWindow?: ActionWindow;
    skirmishes: SkirmishState[];
    assignmentStep?: 'FP_ASSIGN' | 'SHADOW_ASSIGN' | 'COMPLETED';
    lastWoundedCardIds?: string[];
    pendingPhaseEnd?: boolean;
    pendingDeadCardIds?: string[];
    regroupStep?: 'ACTION_WINDOW' | 'SHADOW_REFILL' | 'FP_DECISION' | 'FP_REFILL';
    burdens: number;
    fellowshipCardsDrawn: number;
    setupState?: {
        bids: Record<string, number | null>;
        auctionWinnerId?: string;
        mulligans: Record<string, boolean | null>;
        step: 'BIDDING' | 'CHOOSING_FIRST' | 'AWAITING_SITE' | 'MULLIGAN' | 'COMPLETE';
    };
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
    passedPlayers2?: string[]; // Tableau pour suivre qui a fait "Passer" (ex: ['0'])
    canPass?: boolean;       // Permet de choisir si le bouton "Passer" est affiché
    passesCount?: number;
}

export interface SkirmishState {
    id: string;             // Ex: 'skirmish_comp_01'
    companionId: string;    // ID de la carte du compagnon ciblée
    minionIds: string[];    // Liste des IDs des cartes de séides affectés
    resolved?: boolean;     // Utile pour la phase de combat suivante
}

/** Context fourni aux hooks de Phase (onBegin, onEnd, etc.) */
export type LotrPhaseContext = FnContext<GameState>;

/** Context fourni aux Moves du jeu (contient playerID) */
export interface LotrMoveContext extends FnContext<GameState> {
    playerID: string;
}