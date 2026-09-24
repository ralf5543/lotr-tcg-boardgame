import type { FnContext } from 'boardgame.io';
import type { StatModifier, StatType } from './logic/stats/types';

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
    | 'SANCTUARY'
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

/**
 * Spécifie un jeton de culture dans un effet / coût.
 * `FREE_PEOPLES` = n’importe quelle culture Peuples Libres déjà présente.
 * `ANY` = n’importe quel jeton de culture.
 */
export type CultureTokenSpec = CardCulture | 'FREE_PEOPLES' | 'ANY';

export interface CardI18nContent {
    title: string;
    subtitle?: string;
    gameText?: string;
    loreText?: string;
}

export type CardI18nMap = Partial<
    Record<'fr' | 'en' | 'de' | 'it' | 'es', CardI18nContent>
>;

export type AbilityTargetToken = 'SELF' | 'BEARER' | 'SKIRMISHING' | 'WINNER';

/** SELF / BEARER, ou DNF de titres / filtres (ex. `[['Sam']]`). */
export type AbilityTargetRef = AbilityTargetToken | string[][];

export type SpotMode = 'CONDITION' | 'DESIGNATION';

export interface CostSelector {
    count: number;
    target: AbilityTargetRef;
    mode?: SpotMode;
    /** « another … » : la source ne compte pas pour le spot / exert. */
    excludeSource?: boolean;
}

export interface CostOption {
    spot?: CostSelector[];
    exert?: CostSelector[];
    discardFromPlay?: CostSelector[];
    discardFromHand?: number;
    /**
     * Si la cible d’effet a ce mot-clé, défausser `count` au lieu de
     * `discardFromHand` (Garrison / Sapper : 1 si assiégeant).
     */
    discardFromHandIfEffectHasKeyword?: {
        keyword: CardKeyword;
        count: number;
    };
    spotBurdens?: number;
    removeBurdens?: number;
    addBurdens?: number;
    spotThreats?: number;
    removeThreats?: number;
    addTwilight?: number;
    removeTwilight?: number;
    spotTwilight?: number;
    /** Spotter N jetons de culture (cartes actives). */
    spotCultureTokens?: { culture: CultureTokenSpec; count: number };
    /**
     * Retirer N jetons (coût). `from: 'SELF'` = « from here » ;
     * sinon n’importe laquelle de tes cartes éligibles (désignation si plusieurs).
     */
    removeCultureTokens?: {
        culture: CultureTokenSpec;
        count: number;
        from?: 'SELF';
    };
    /** « if you have N or more cards in hand » */
    spotHand?: number;
    /** « discard your hand » — toute la main. */
    discardEntireHand?: boolean;
}

export type AbilityCost = CostOption[];

export type AbilityEffectExpiry = 'REGROUP' | 'SKIRMISH' | 'TURN_END';

export type AbilityEffect =
    | {
          type: 'ADD_TEMP_KEYWORD';
          keyword: CardKeyword;
          target: AbilityTargetRef;
          expiresAtPhase: AbilityEffectExpiry;
      }
    | {
          type: 'ADD_TEMP_STAT';
          stat: StatType;
          value: number;
          target: AbilityTargetRef;
          expiresAtPhase: AbilityEffectExpiry;
          bearingBonus?: {
              value: number;
              attachment: string[][];
          };
          /** Copie la force actuelle de la source au moment de l’activation (Merry…). */
          valueFromSourceStat?: 'STRENGTH';
          /**
           * Bonus = value × jetons de culture sur cette carte (SELF).
           * « +1 for each [culture] token here (limit +3) ».
           */
          perCultureTokensOnSelf?: {
              culture: CardCulture;
              /** Plafond du bonus total (pas le plafond multi-activations). */
              limit?: number;
          };
          /** « another companion » : exclure la source des cibles. */
          excludeSource?: boolean;
          /** Plafond cumulé des bonus de cette capacité (ex. limit +5). */
          limit?: number;
          /** Si tu as l’initiative, utiliser cette valeur à la place de `value`. */
          valueIfInitiative?: number;
      }
    | {
          /** Modificateur passif (While…) — pas d’expiration de phase. */
          type: 'MODIFY_STAT';
          stat: StatType;
          value: number;
          target: AbilityTargetRef;
          /**
           * Bonus = value × nombre de cartes matchant `target` spotées.
           * (ex. +1 for each companion you can spot)
           */
          perSpot?: {
              target: string[][];
              /** Uniquement la compagnie FP (défaut : tout en jeu). */
              inFellowship?: boolean;
              /** Compter les cartes empilées sur les sites (pas en jeu). */
              stackedOnSites?: boolean;
              limit?: number;
          };
          /**
           * Bonus = value × races distinctes listées présentes
           * (ex. Gandalf 1R72 : Hobbit, Dwarf, Elf, Man).
           */
          perDistinctRace?: {
              races: string[];
              inFellowship?: boolean;
          };
          /**
           * Bonus = value × min(jetons culture sur SELF, jetons culture sur
           * une carte en jeu au titre donné), plafonné.
           * « While X [c1] tokens on this card and the same number of [c2]
           * tokens on [Card Name], … strength +X (limit +N) ».
           */
          perMatchingTokensOnNamedCard?: {
              selfCulture: CardCulture;
              otherCulture: CardCulture;
              /** Titre VO (ex. « Final Count »). */
              otherCardTitle: string;
              limit?: number;
          };
      }
    | {
          /** Mot-clé passif (While…) — pas d’expiration de phase. */
          type: 'MODIFY_KEYWORD';
          keyword: CardKeyword;
          target: AbilityTargetRef;
      }
    | {
          /** Passif While : ignorer une phase tant que la condition tient. */
          type: 'SKIP_PHASE';
          phase: 'ARCHERY';
      }
    | {
          /**
           * Passif While : le joueur indiqué ne peut pas remplacer
           * le site courant / la région / n’importe quel site.
           */
          type: 'CANNOT_REPLACE_SITE';
          player: 'FREE_PEOPLE';
          scope: 'CURRENT' | 'REGION' | 'ANY';
      }
    | {
          /**
           * Passif : interdit événements et/ou capacités spéciales Skirmish.
           * Faramir (adversaire, combat impliquant la source) ;
           * Cavern Entrance (tous, site courant).
           */
          type: 'FORBID_SKIRMISH_ACTIONS';
          /** Qui est bloqué. OPPONENT = adversaire du propriétaire de la source. */
          who: 'OPPONENT' | 'ALL' | 'FREE_PEOPLE' | 'SHADOW';
          events?: boolean;
          specialAbilities?: boolean;
          /** Uniquement pendant un combat impliquant la source (Faramir). */
          involvingSource?: boolean;
      }
    | {
          /**
           * Remplace un site du chemin par un site du deck d’aventure.
           * La cible choisie = id du site dans sitesDeck (avant activateAbility).
           */
          type: 'REPLACE_SITE';
          /** Site où se trouve la compagnie, ou tout site de la région courante. */
          scope: 'CURRENT' | 'REGION';
          from: 'SITES_DECK';
          /** Filtre terrain optionnel (underground, plains…). */
          siteKeyword?: CardKeyword;
      }
    | {
          /**
           * Échange un de tes sites du path avec un site de ton deck d’aventure.
           * (≠ replace : pas bloqué par cannot replace ; uniquement sites dont tu es propriétaire.)
           * Cibles : [pathSiteId, deckSiteId].
           */
          type: 'EXCHANGE_SITE';
          from: 'SITES_DECK';
      }
    | {
          /**
           * Prend le contrôle du site non contrôlé de plus bas numéro
           * déjà passé par la compagnie (CR Standard). Pas de choix joueur.
           */
          type: 'TAKE_CONTROL_SITE';
      }
    | {
          /**
           * Oblige le joueur FP à se déplacer à nouveau ce tour
           * (si la limite de moves le permet) — No Retreat, etc.
           */
          type: 'FORCE_CHOOSE_MOVE_AGAIN';
      }
    | {
          /**
           * Libère le site adverse contrôlé de plus haut numéro (CR).
           * Site reste sur le path ; attachments défaussés.
           */
          type: 'LIBERATE_SITE';
      }
    | {
          /**
           * Empile un séide sur un site que tu contrôles.
           * Sans `target` : empile la source. Avec filtre (ex. besieger) : désigner le séide.
           * Cibles choisies : `[minionId?, siteId?]` (site seulement si plusieurs contrôlés).
           */
          type: 'STACK_ON_CONTROLLED_SITE';
          target?: AbilityTargetRef;
      }
    | {
          /**
           * Joue un séide depuis la pile d’un site que tu contrôles.
           * Sans `target` : joue la source. Avec filtre : désigner un séide empilé.
           * Coût crépuscule = coût effectif − twilightReduce (min 0).
           * `grantsTempKeywords` : appliqués au séide joué (ex. Olog → Fierce + Damage).
           */
          type: 'PLAY_FROM_STACK';
          twilightReduce?: number;
          target?: AbilityTargetRef;
          grantsTempKeywords?: {
              keyword: CardKeyword;
              expiresAtPhase: AbilityEffectExpiry;
          }[];
          /** Bonus de stats sur le séide joué (ex. Officer → force +6). */
          grantsTempStats?: {
              stat: StatType;
              value: number;
              expiresAtPhase: AbilityEffectExpiry;
          }[];
      }
    | {
          type: 'DRAW';
          count: number;
      }
    | {
          type: 'HEAL';
          count?: number;
          /** Magnitude = nombre spoté (ex. soigner X fois). */
          countFromSpot?: boolean;
          /**
           * Soigner des compagnons distincts, 1 soin chacun.
           * N = min(pipes spotées, compagnons blessés) — autant que possible, jusqu’à X.
           */
          multiFromSpot?: boolean;
          target: AbilityTargetRef;
      }
    | {
          type: 'DISCARD';
          count: number;
          target: AbilityTargetRef;
      }
    | {
          /** Défausse toutes les cartes en jeu qui matchent (ex. every condition). */
          type: 'DISCARD_ALL';
          target: string[][];
      }
    | {
          type: 'DISCARD_FROM_HAND';
          count: number;
          /** « up to N » : 0 à count, le joueur choisit. */
          upTo?: boolean;
      }
    | {
          type: 'REMOVE_TWILIGHT';
          count?: number;
          /** X = nombre de cartes du spot du coût (pipes). */
          countFromSpot?: boolean;
      }
    | {
          type: 'REMOVE_BURDENS';
          count?: number;
          countFromSpot?: boolean;
      }
    | {
          type: 'REMOVE_THREATS';
          count: number;
      }
    | {
          /**
           * Place N jetons de culture sur la cible (même à 0).
           * « place a [culture] token on this card / here ».
           */
          type: 'PLACE_CULTURE_TOKEN';
          culture: CardCulture;
          count: number;
          target: AbilityTargetRef;
      }
    | {
          /**
           * Reinforce : ajoute N jetons sur une/des de tes cartes
           * qui ont déjà ≥ 1 jeton de la culture (CR Bloodlines).
           * Cible désignée = carte(s) ; un seul id = les N sur cette carte.
           */
          type: 'REINFORCE_CULTURE_TOKEN';
          culture: CultureTokenSpec;
          count: number;
      }
    | {
          /**
           * Retire N jetons (effet). `target: 'SELF'` = from here.
           */
          type: 'REMOVE_CULTURE_TOKEN';
          culture: CultureTokenSpec;
          count: number;
          target: AbilityTargetRef;
      }
    | {
          /** Annule une escarmouche impliquant la cible (pas de vainqueur / blessures). */
          type: 'CANCEL_SKIRMISH';
          involving: AbilityTargetRef;
          /** Ombre peut retirer N crépuscule pour empêcher l’effet (Escape, etc.). */
          shadowMayPrevent?: { removeTwilight: number };
      }
    | {
          type: 'WOUND';
          count: number;
          target: AbilityTargetRef;
          excludeRingBearer?: boolean;
      }
    | {
          /** Affaiblir (exert) une cible — effet, pas coût. */
          type: 'EXERT';
          count: number;
          target: AbilityTargetRef;
      }
    | {
          /**
           * Exhaust : blesser jusqu’à 1 vitalité restante (CR).
           * « Exhaust a companion / minion ».
           */
          type: 'EXHAUST';
          target: AbilityTargetRef;
          excludeRingBearer?: boolean;
      }
    | {
          type: 'ADD_TWILIGHT';
          count: number;
      }
    | {
          type: 'PREVENT_WOUND';
      }
    | {
          type: 'WEAR_RING';
          expiresAtPhase: AbilityEffectExpiry;
          replaceWoundWithBurdens: number;
          onlyInSkirmish?: boolean;
          strengthBonus?: number;
      }
    | {
          type: 'ALLOW_SKIRMISH';
          target: AbilityTargetRef;
      }
    | {
          type: 'MAKE_RING_BEARER';
          resistance: number;
      };

export type AbilityTrigger =
    | {
          type: 'ABOUT_TO_WOUND';
          target: AbilityTargetRef;
          inSkirmish?: boolean;
      }
    | {
          type: 'WINS_SKIRMISH';
          winner: AbilityTargetRef;
          yours?: boolean;
      }
    | {
          type: 'WHEN_PLAYED';
          /** Si présent : n’applique que si N sites path ont ce mot-clé. */
          spotSiteKeyword?: { keyword: CardKeyword; count: number };
      }
    | {
          /** Each time you play a [classe]… (la carte jouée matche `played`). */
          type: 'YOU_PLAY';
          played: string[][];
      }
    | {
          /**
           * Passif While : vrai tant que la condition tient.
           * Pas un toaster — lu au calcul de stats.
           */
          type: 'WHILE';
          spot?: CostSelector[];
          spotTwilight?: number;
          /** « While you can spot N [culture] tokens » (cartes actives du joueur). */
          spotCultureTokens?: { culture: CultureTokenSpec; count: number };
          /**
           * « While you can spot X [c1] tokens on this card and the same number
           * of [c2] tokens on [Card Name] » — vrai si min(self, other) ≥ 1.
           */
          matchingTokensOnNamedCard?: {
              selfCulture: CardCulture;
              otherCulture: CardCulture;
              otherCardTitle: string;
          };
          /** Adversaire(s) de l’escarmouche (While skirmishing a …). */
          skirmishing?: { target: string[][] };
          /** Attachement porté (While … bears a …). */
          bearing?: { target: string[][] };
          /** Compagnie sur un site portant ce mot-clé (terrains / Sanctuary). */
          atSiteKeyword?: CardKeyword;
          /** Spot N sites du chemin avec ce mot-clé. */
          spotSiteKeyword?: { keyword: CardKeyword; count: number };
          /** While no opponent controls a site… */
          noOpponentControlsSite?: boolean;
          /** While this card is stacked on a site you control… */
          stackedOnControlledSite?: boolean;
          /** While the fellowship is at the site hosting this attachment… */
          atAttachedSite?: boolean;
          /**
           * « While you can spot N burdens or N wounds on the Ring-bearer »
           * — vrai si fardeaux ≥ N OU blessures sur le Porteur ≥ N.
           */
          spotBurdensOrRingBearerWounds?: number;
      }
    | {
          type: 'CHARACTER_DIES';
          target: AbilityTargetRef;
      }
    | {
          /** Site : When the fellowship moves to this site… */
          type: 'MOVES_TO';
      }
    | {
          /** Site : When the fellowship moves from this site… */
          type: 'MOVES_FROM';
      }
    | {
          /** Each time the fellowship moves… (réponse optionnelle). */
          type: 'FELLOWSHIP_MOVES';
      };

export interface Ability {
    id: string;
    phases: string[];
    cost: AbilityCost;
    effects: AbilityEffect[];
    source: 'SELF' | 'ATTACHMENT';
    text?: string;
    omitFromArcheryTotal?: boolean;
    trigger?: AbilityTrigger;
    /** « you may » : choix du joueur (toaster), pas une résolution auto. */
    optional?: boolean;
    /** Ex. Merry : seulement s’il n’est pas affecté à une escarmouche. */
    requiresUnassigned?: boolean;
    /**
     * Capacité utilisable seulement si la carte est empilée
     * sur un site contrôlé par son propriétaire (play from stack).
     */
    requiresStackedOnControlledSite?: boolean;
}

export interface CardState {
    id: string;
    instanceId: string;

    // Objet de traductions multi-langues
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
    aidCost?: AidCost;
    isUnique: boolean;
    isFemale?: boolean;
    // Mots-clés temporaires gagnés via une capacité
    tempKeywords?: TempKeywordModifier[];
    isActionable?: boolean;
    attachedViaAid?: boolean;

    // Mots-clés qu'une carte confère à son porteur lorsqu'elle est attachée (ex: un Arc qui donne 'ARCHER')
    grantsKeywords?: CardKeyword[];

    // Statistiques & Coûts
    twilightCost?: number;
    strength?: number;
    vitality?: number;
    resistance?: number;
    minionSiteNumber?: number;
    signet?: CardSignet;

    // État dynamique en jeu
    attachments?: CardState[];
    attachedTo?: string | string[];
    phases?: string[];
    wounds?: number;
    /**
     * Jetons de culture sur cette carte (CR : place / reinforce / remove).
     * Une culture dominante par carte en pratique.
     */
    cultureTokens?: Partial<Record<CardCulture, number>>;
    isStartingMember?: boolean;
    isFaceDown?: boolean;
    omitFromArcheryTotal?: boolean;
    /** Peu hâtif : un effet d’affectation a autorisé ce personnage à combattre. */
    allowedToSkirmish?: boolean;
    name?: string; // Si conservé pour compatibilité ou identification
    isDead?: boolean;
    isOverwhelmed?: boolean;
    actionPhases?: string[];
    abilities?: Ability[];
    toPlay?: CostOption[];
    /**
     * Condition / possession : « Plays on a site you control ».
     * Pose uniquement si `site.controlledBy ===` joueur actif.
     */
    requiresControlledSite?: boolean;
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
    /** Affichage legacy ; souvent synonyme de title issu du JSON. */
    name: string;
    twilightCost: number;
    gameText: string;
    ownerId: string;
    imageUrl?: string;
    keywords?: CardKeyword[];
    /** Cartes posées sur le site (climats, etc.). */
    attachments?: CardState[];
    /**
     * Séides empilés sur le site (stack). Uniquement utiles si
     * `controlledBy` = joueur Ombre pour « play from stack ».
     */
    stacked?: CardState[];
    /**
     * Joueur qui contrôle le site (`0` / `1`). Distinct de `ownerId`
     * (propriétaire du deck d’aventure). Reste sur le chemin (UX Standard).
     */
    controlledBy?: string;
    /** Gametext site (fragments sûrs uniquement). */
    abilities?: Ability[];
}
export interface PlayerMusterInfo {
    allowedCount: number;
    discardedCount: number;
    isDone: boolean;
}

export interface PlayerStartOfPhaseInfo {
    isDone: boolean;
}

export interface StartOfPhaseState {
    players: Record<string, PlayerStartOfPhaseInfo>;
}

export interface PendingPlay {
    playerId: string;
    card: CardState;
    handIndex: number;
    prompt: string;
}

export interface PendingWoundEvent {
    type: 'ABOUT_TO_WOUND';
    targetId: string;
    remaining: number;
}

export interface PendingWinsSkirmish {
    winnerIds: string[];
    skirmishId: string;
}

export interface PendingWinsSkirmishEvent extends PendingWinsSkirmish {
    type: 'WINS_SKIRMISH';
}

export interface PendingCharacterDiesEvent {
    type: 'CHARACTER_DIES';
    deadCardId: string;
}

/** Effet d’annulation d’escarmouche engagé ; l’Ombre peut encore l’empêcher. */
export interface PendingCancelSkirmishEvent {
    type: 'ABOUT_TO_CANCEL_SKIRMISH';
    skirmishId: string;
    removeTwilight: number;
}

export interface PendingFellowshipMovesEvent {
    type: 'FELLOWSHIP_MOVES';
}

export type PendingEvent =
    | PendingWoundEvent
    | PendingWinsSkirmishEvent
    | PendingCharacterDiesEvent
    | PendingCancelSkirmishEvent
    | PendingFellowshipMovesEvent;

export interface WoundQueueItem {
    targetId: string;
    count: number;
}

export interface ResponseWindow {
    isOpen: boolean;
    title?: string;
    message?: string;
    activePlayerId: string;
    canPass?: boolean;
    passesCount?: number;
    /**
     * Capacités déjà jouées pour cet événement
     * (`instanceId::abilityId`) — une fois par occurrence « each time ».
     */
    usedResponseKeys?: string[];
}

export interface GameState {
    fpPlayerId: string;
    twilightPool: number;
    currentSiteIndex?: number;
    tempModifiers?: StatModifier[];
    currentSite?: number;
    movesThisTurn?: number;
    /**
     * Effet « choose to move again » (No Retreat…) : en FP_DECISION,
     * le joueur FP ne peut pas terminer le tour tant que moves < 2.
     */
    forceChooseMoveAgain?: boolean;
    path: (SiteCardState | null)[];
    battlefield: CardState[];
    musterState?: {
        players: Record<string, PlayerMusterInfo>;
    };
    maneuverStep?: 'MANEUVER_START' | 'MANEUVER_ACTIONS';
    startOfPhaseState?: StartOfPhaseState;
    /**
     * Sanctuaire (sites 3 et 6) : jusqu’à 5 blessures à soigner au début
     * de la compagnie. Le joueur répartit comme il veut, ou valide à 0.
     */
    sanctuaryHeal?: { remaining: number };
    players: Record<string, PlayerState>;
    awaitingSiteSelection: boolean;
    isFierceAssignment?: boolean;
    pendingFierceAssignment?: boolean;
    statusMessage: string;
    activeSkirmishId?: string;
    actionWindow?: ActionWindow;
    pendingEvent?: PendingEvent;
    /** Victoire d’escarmouche en attente : s’ouvre après la file de blessures. */
    pendingWinsSkirmish?: PendingWinsSkirmish;
    /** Morts en attente d’une éventuelle fenêtre CHARACTER_DIES. */
    pendingDeathQueue?: string[];
    responseWindow?: ResponseWindow;
    wearingTheOneRing?: {
        expiresAtPhase: AbilityEffectExpiry;
        replaceWoundWithBurdens: number;
        onlyInSkirmish?: boolean;
        strengthBonus?: number;
    };
    woundQueue?: WoundQueueItem[];
    skirmishes: SkirmishState[];
    archeryState?: ArcheryState;
    assignmentStep?: 'ACTIONS' | 'FP_ASSIGN' | 'SHADOW_ASSIGN' | 'COMPLETED';
    archeryAssignStep?: 'FP' | 'SHADOW' | undefined;
    lastWoundedCardIds?: string[];
    lastExertedCardIds?: string[];
    lastHealedCardIds?: string[];
    pendingPhaseEnd?: boolean;
    /** Après une réponse (ex. each-time fellowship moves), reprendre cette phase. */
    pendingPhaseAfterResponse?: string;
    /** Archerie : une réponse est ouverte, reprendre l’attribution ou clore après. */
    archeryAfterResponses?: 'END' | 'SHADOW_ASSIGN';
    /** Action de phase (archerie, combat…) qui a ouvert une fenêtre de réponse : céder la priorité une fois les réponses closes. */
    pendingActionYieldPlayerId?: string;
    nextPhase?: string;
    pendingDeadCardIds?: string[];
    archeryWoundsToAssign?: number;
    /** Blessures à assigner aux compagnons après une mort (menaces converties). */
    threatWoundsToAssign?: number;
    regroupStep?:
        | 'MUSTER_STEP'
        | 'START_OF_REGROUP'
        | 'ACTION_WINDOW'
        | 'SHADOW_REFILL'
        | 'FP_DECISION'
        | 'FP_REFILL';
    fellowshipCardsDrawn: number;
    pendingPlay?: PendingPlay;
    /** Choix optionnel « When you play » (you may…). */
    pendingWhenPlayed?: {
        playerId: string;
        sourceInstanceId: string;
        abilityId: string;
        phase?: string;
    };
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

export type DevPresetType = 'CULTURE_TOKENS_TEST';

export interface TempKeywordModifier {
    keyword: CardKeyword;
    expiresAtPhase?: AbilityEffectExpiry;
}

// Structure du coût d'Aide pour les Followers
export interface AidCost {
    type: 'TWILIGHT' | 'THREAT' | 'BURDEN';
    amount: number;
}