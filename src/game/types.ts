import type { FnContext } from 'boardgame.io';

export type CardKind = 'FREE_PEOPLE' | 'SHADOW' | 'NONE';

export type CardKeyword =
    | 'AID'
    | 'AMBUSH 1'
    | 'AMBUSH 2'
    | 'AMBUSH 3'
    | 'AMBUSH 5'
    | 'ARCHER'
    | 'BATTLEGROUND'
    | 'BESIEGER'
    | 'CORSAIR'
    | 'DAMAGE +1'
    | 'DAMAGE +2'
    | 'DAMAGE +3'
    | 'DAMAGE +4'
    | 'DEFENDER +1'
    | 'DEFENDER +2'
    | 'DEFENDER +3'
    | 'DEFENDER +4'
    | 'DWELLING'
    | 'EASTERLING'
    | 'ENDURING'
    | 'ENGINE'
    | 'FIERCE'
    | 'FOREST'
    | 'FORTIFICATION'
    | 'HUNTER 1'
    | 'HUNTER 2'
    | 'HUNTER 3'
    | 'HUNTER 4'
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
    | 'TOIL 1'
    | 'TOIL 2'
    | 'TOIL 3'
    | 'TRACKER'
    | 'TWILIGHT'
    | 'UNBOUND'
    | 'UNDERGROUND'
    | 'UNHASTY'
    | 'VALIANT'
    | 'VILLAGER'
    | 'WARG-RIDER'
    | 'WEATHER';

export type CardSignet = 'ARAGORN' | 'FRODO' | 'GANDALF' | 'THEODEN';

export type CardType =
    | 'ALLY'
    | 'ARTIFACT'
    | 'COMPANION'
    | 'CONDITION'
    | 'EVENT'
    | 'FOLLOWER'
    | 'MINION'
    | 'POSSESSION'
    | 'RING';

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
    | 'SUPPORT-AREA'
    | 'STAFF';

export type CardRace =
    | 'BALROG'
    | 'CREATURE'
    | 'DWARF'
    | 'ELF'
    | 'ENT'
    | 'HALF-TROLL'
    | 'HOBBIT'
    | 'MAIA'
    | 'MAN'
    | 'NAZGÛL'
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
    | 'ROHAN'
    | 'SAURON'
    | 'SHIRE'
    | 'THE-ONE-RING'
    | 'URUK-HAI'
    | 'WRAITH';

export interface CardI18nContent {
    title: string;
    subtitle?: string;
    gameText?: string;
    loreText?: string;
}

export type CardI18nMap = Partial<
    Record<'fr' | 'en' | 'de' | 'it' | 'es', CardI18nContent>
>;
export interface CardState {
    id: string;
    instanceId: string;

    // 🟢 Objet de traductions multi-langues
    i18n?: CardI18nMap;

    // Champs de texte racine (facultatifs ou servant de valeurs par défaut si i18n est absent)
    title?: string;
    subtitle?: string;
    gameText?: string;
    loreText?: string;

    // Metadonnées & Média
    imageUrl?: string;
    kind: CardKind;
    culture: CardCulture;
    type: CardType;
    set: number;
    rarity: string;
    
    subtype?: CardSubtype;
    race?: CardRace;
    keywords?: CardKeyword[];
    isUnique: boolean;
    isFemale?: boolean;

    // Statistiques & Coûts
    twilightCost?: number;
    strength?: number;
    vitality?: number;
    resistance?: number;
    minionSiteNumber?: number;
    signet?: CardSignet;

    // État dynamique en jeu
    attachments?: CardState[];
    attachedTo?: string[][];
    phases?: string[];
    wounds?: number;
    isStartingMember?: boolean;
    isFaceDown?: boolean;
    name?: string; // Si conservé pour compatibilité ou identification
    isDead?: boolean;
    isOverwhelmed?: boolean;
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
    burdens: number;
    threats: number;
    archeryTotal?: number;
    hasDiscardedInRegroup?: boolean;
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
    archeryState?: ArcheryState;
    assignmentStep?: 'FP_ASSIGN' | 'SHADOW_ASSIGN' | 'COMPLETED';
    archeryAssignStep?: 'FP' | 'SHADOW' | undefined;
    lastWoundedCardIds?: string[];
    pendingPhaseEnd?: boolean;
    pendingDeadCardIds?: string[];
    archeryWoundsToAssign?: number;
    regroupStep?:
        | 'ACTION_WINDOW'
        | 'SHADOW_REFILL'
        | 'FP_DECISION'
        | 'FP_REFILL';
    fellowshipCardsDrawn: number;
    setupState?: {
        bids: Record<string, number | null>;
        auctionWinnerId?: string;
        mulligans: Record<string, boolean | null>;
        step:
            | 'BIDDING'
            | 'CHOOSING_FIRST'
            | 'AWAITING_SITE'
            | 'MULLIGAN'
            | 'COMPLETE';
    };
    mulliganChoices?: Record<string, 'kept' | 'mulliganed' | null>;
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
    canPass?: boolean; // Permet de choisir si le bouton "Passer" est affiché
    passesCount?: number;
}

export interface SkirmishState {
    id: string; // Ex: 'skirmish_comp_01'
    companionId: string; // ID de la carte du compagnon ciblée
    minionIds: string[]; // Liste des IDs des cartes de séides affectés
    resolved?: boolean; // Utile pour la phase de combat suivante
}

/** Context fourni aux hooks de Phase (onBegin, onEnd, etc.) */
export type LotrPhaseContext = FnContext<GameState>;

/** Context fourni aux Moves du jeu (contient playerID) */
export interface LotrMoveContext extends FnContext<GameState> {
    playerID: string;
}

export interface ArcheryState {
    step?: 'ACTIONS' | 'FP_ASSIGN' | 'SHADOW_ASSIGN' | 'COMPLETE';
    fpTotal: number;
    shadowTotal: number;
    fpRemainingWounds: number;
    shadowRemainingWounds: number;
}

export type DevPresetType = 'ARCHERY_TEST' | 'SKIRMISH_TEST';