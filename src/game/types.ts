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
    /** « If you cannot spot N threats » — menaces FP < N. */
    cannotSpotThreats?: number;
    removeThreats?: number;
    /** « add a threat » comme coût. */
    addThreats?: number;
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
          /**
           * Si le propriétaire a moins de `fewerThan` cartes en main,
           * utiliser `value` à la place.
           */
          valueIfFewerCardsInHand?: {
              fewerThan: number;
              value: number;
          };
          /** Bonus = value × cartes spotées (Pippin's Sword…). */
          perSpot?: { target: string[][] };
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
              /** « for each other … » : exclure la source. */
              excludeSource?: boolean;
              limit?: number;
          };
          /** Bonus = value × menaces FP (Aragorn / Pippin Driven…). */
          perThreats?: boolean;
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
          /**
           * Bonus = value × jetons de culture spotables (cartes actives).
           * « strength +1 for each Free Peoples culture token you can spot »
           */
          perCultureTokens?: {
              culture: CultureTokenSpec;
              limit?: number;
          };
          /**
           * Bonus = value × cartes matchant `target` qui portent ≥ 1 jeton.
           * « strength +1 for each gondor card that has a culture token on it »
           */
          perCardWithCultureToken?: {
              target: string[][];
              limit?: number;
          };
          /**
           * Bonus = value × cartes en main.
           * « +1 for each card in your hand » / « in the Free Peoples player's hand »
           */
          perCardsInHand?: {
              whose: 'OWNER' | 'FREE_PEOPLES';
              limit?: number;
          };
          /** « each other companion » : exclure la source des bénéficiaires. */
          excludeSource?: boolean;
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
           * Empile une carte sur la source (SELF).
           * `from: 'HAND'` = depuis la main ; `PLAY` = séide du champ.
           * `target: 'WINNER'` = vainqueur d’escarmouche (Goblin Swarms…).
           * `maxStacked` : plafond (Web : 3).
           */
          type: 'STACK_ON_SELF';
          from: 'HAND' | 'PLAY';
          target: string[][] | 'WINNER';
          maxStacked?: number;
      }
    | {
          /** Remet en main une carte empilée sur la source. */
          type: 'TAKE_FROM_STACK';
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
          /**
           * Joue un séide empilé sur la source (Web) comme depuis la main.
           * Paie le crépuscule effectif.
           */
          type: 'PLAY_FROM_CARD_STACK';
          target: string[][];
      }
    | {
          /**
           * Joue une carte depuis la pioche ou la défausse (Captured by the Ring…).
           * Paie le crépuscule ; mélange la pioche après recherche.
           * Cible choisie : id de la carte dans deck|discard.
           * `attachTo: 'SELF'` : attache sur la source (Gandalf Returned…).
           */
          type: 'PLAY_FROM_DECK_OR_DISCARD';
          target: string[][];
          attachTo?: 'SELF';
      }
    | {
          /**
           * Cherche une carte dans la pioche (filtre) et la place en défausse.
           * Mélange ensuite la pioche (Long-stemmed Pipe…).
           */
          type: 'SEARCH_DECK_TO_DISCARD';
          target: string[][];
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
          /** Filtre DNF, ou adversaires d’escarmouche de la source. */
          target: string[][] | 'SKIRMISHING';
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
          type: 'ADD_THREATS';
          count: number;
      }
    | {
          /**
           * Place N jetons de culture sur la cible (même à 0).
           * « place a [culture] token on this card / here ».
           * `perSpot` : N × cartes matchant (When you play… for each X you spot).
           */
          type: 'PLACE_CULTURE_TOKEN';
          culture: CardCulture;
          count: number;
          target: AbilityTargetRef;
          /** N × cartes matchant (When you play… for each X you spot). */
          perSpot?: { target: string[][] };
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
          /**
           * Adversaires d’escarmouche d’un personnage nommé (They Stole It :
           * companion Gollum is skirmishing).
           */
          involving?: string[][];
          /** Blessures ×N si la cible a cette culture. */
          countIfCulture?: { culture: CardCulture; count: number };
      }
    | {
          /** Renvoie une carte en jeu dans la main de son propriétaire. */
          type: 'RETURN_TO_HAND';
          target: AbilityTargetRef;
      }
    | {
          /**
           * Pose le prochain site du chemin depuis le deck d’aventure
           * (Mere of Dead Faces…). Cible = id dans sitesDeck.
           */
          type: 'PLAY_NEXT_SITE';
          from: 'SITES_DECK';
      }
    | {
          /**
           * Interdit l’affectation jusqu’à expiry (Shelob Her Ladyship…).
           * Désignation d’un compagnon.
           */
          type: 'FORBID_ASSIGN';
          target: AbilityTargetRef;
          expiresAtPhase: AbilityEffectExpiry;
      }
    | {
          /**
           * Affectation forcée (Saruman / Orthanc Champion…).
           * FP peut affaiblir le compagnon pour empêcher.
           * `COST_TARGET` = séide désigné au coût (spot).
           */
          type: 'FORCE_ASSIGN';
          minion: AbilityTargetRef | 'COST_TARGET';
          companion: AbilityTargetRef;
          excludeRingBearer?: boolean;
          fpMayPrevent?: { exert: true };
      }
    | {
          /** Affaiblir (exert) une cible — effet, pas coût. */
          type: 'EXERT';
          count: number;
          target: AbilityTargetRef;
          /** Tous les matchs (each minion skirmishing must exert). */
          all?: boolean;
      }
    | {
          /**
           * Exhaust : blesser jusqu’à 1 vitalité restante (CR).
           * « Exhaust a companion / minion ».
           */
          type: 'EXHAUST';
          target: AbilityTargetRef;
          excludeRingBearer?: boolean;
          /** FP peut ajouter N fardeaux pour empêcher (Can You Protect Me…). */
          fpMayPrevent?: { addBurdens: number };
      }
    | {
          type: 'ADD_TWILIGHT';
          count: number;
      }
    | {
          /** Ajoute N fardeaux au joueur FP (contraintes de Porteur alternatif…). */
          type: 'ADD_BURDENS';
          count: number;
      }
    | {
          /**
           * Choix forcé entre N suites d’effets (add 3 burdens or wound twice…).
           * Runtime : `pendingForcedChoice` + toaster, pas d’auto-application.
           */
          type: 'CHOOSE_ONE';
          options: {
              label: string;
              effects: AbilityEffect[];
          }[];
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
          /**
           * Après qu’une blessure a réellement été prise (pas fardeaux Anneau).
           * « during a skirmish » = activeSkirmishId posé (y compris résolution).
           */
          type: 'TAKES_WOUND';
          target: AbilityTargetRef;
          inSkirmish?: boolean;
          involving?: AbilityTargetRef;
      }
    | {
          type: 'WINS_SKIRMISH';
          winner: AbilityTargetRef;
          yours?: boolean;
      }
    | {
          type: 'LOSES_SKIRMISH';
          loser: AbilityTargetRef;
          yours?: boolean;
          /** « … loses a skirmish involving a dunland Man » */
          involving?: AbilityTargetRef;
      }
    | {
          type: 'WHEN_PLAYED';
          /** Si présent : n’applique que si N sites path ont ce mot-clé. */
          spotSiteKeyword?: { keyword: CardKeyword; count: number };
          /** Ignore si la carte est membre de la fellowship de départ. */
          exceptStartingFellowship?: boolean;
      }
    | {
          /**
           * Début d’un combat précis (selectSkirmish), pas la phase startOfSkirmish.
           * `involving` : SELF / BEARER / filtre — le combat doit impliquer cette carte.
           * `whileRingBearer` : uniquement si la source est le Porteur.
           */
          type: 'START_OF_SKIRMISH';
          involving: AbilityTargetRef;
          whileRingBearer?: boolean;
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
          skirmishing?: {
              target: string[][];
              /** Résistance effective ≤ N (Squad of Uruk-hai…). */
              resistanceAtMost?: number;
          };
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
          /** « While you have initiative… » — propriétaire de la source. */
          hasInitiative?: boolean;
          /** « While you cannot spot N threats… » — menaces FP < N. */
          cannotSpotThreats?: number;
          /**
           * « While [this / Name] is in region N… »
           * — vrai si la compagnie est en région N (sites 1–3 / 4–6 / 7–9).
           */
          inRegion?: 1 | 2 | 3;
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
    /**
     * Cartes empilées sur cette carte (Web, Fragments de Narsil…).
     * Distinct de `site.stacked` (sites contrôlés).
     */
    stacked?: CardState[];
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
    /** Saruman etc. : ne peut pas être affecté à une escarmouche. */
    cannotBeAssignedToSkirmish?: boolean;
    /** Ne peut pas recevoir de blessures d’archerie. */
    cannotTakeArcheryWounds?: boolean;
    /** Interdit d’affectation jusqu’à fin de tour / phase (Shelob…). */
    forbidAssignUntil?: AbilityEffectExpiry;
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

export interface PendingTakesWoundEvent {
    type: 'TAKES_WOUND';
    targetId: string;
    skirmishId?: string;
}

export interface PendingWinsSkirmish {
    winnerIds: string[];
    skirmishId: string;
}

export interface PendingWinsSkirmishEvent extends PendingWinsSkirmish {
    type: 'WINS_SKIRMISH';
}

export interface PendingLosesSkirmish {
    loserIds: string[];
    skirmishId: string;
}

export interface PendingLosesSkirmishEvent extends PendingLosesSkirmish {
    type: 'LOSES_SKIRMISH';
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

/** Exhaust engagé ; le joueur FP peut encore l’empêcher (fardeaux). */
export interface PendingExhaustEvent {
    type: 'ABOUT_TO_EXHAUST';
    targetId: string;
    addBurdens: number;
}

/** Affectation forcée ; le compagnon peut s’affaiblir pour empêcher. */
export interface PendingForceAssignEvent {
    type: 'ABOUT_TO_FORCE_ASSIGN';
    minionId: string;
    companionId: string;
}

export interface PendingFellowshipMovesEvent {
    type: 'FELLOWSHIP_MOVES';
}

export type PendingEvent =
    | PendingWoundEvent
    | PendingTakesWoundEvent
    | PendingWinsSkirmishEvent
    | PendingLosesSkirmishEvent
    | PendingCharacterDiesEvent
    | PendingCancelSkirmishEvent
    | PendingExhaustEvent
    | PendingForceAssignEvent
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
    pendingLosesSkirmish?: PendingLosesSkirmish;
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
    /** Blessures réellement prises — réponses « each time … takes a wound ». */
    takesWoundQueue?: { targetId: string; skirmishId?: string }[];
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
    /**
     * Choix forcé (contrainte Porteur alternatif en début d’escarmouche…).
     * Bloque la fenêtre d’actions jusqu’à résolution.
     */
    pendingForcedChoice?: {
        playerId: string;
        sourceInstanceId: string;
        abilityId: string;
        skirmishId: string;
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

export type DevPresetType = 'STAT_PULSE_TEST' | 'WEB_STACK_TEST';

export interface TempKeywordModifier {
    keyword: CardKeyword;
    expiresAtPhase?: AbilityEffectExpiry;
}

// Structure du coût d'Aide pour les Followers
export interface AidCost {
    type: 'TWILIGHT' | 'THREAT' | 'BURDEN';
    amount: number;
}