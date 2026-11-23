import type { SupportedLanguage } from '../languages';

/** Consignes de ciblage / overlays (plateau + main). */
export type TargetingMessages = {
    chooseTarget: string;
    chooseBearer: string;
    chooseCardToPlay: string;
    chooseCardToPlayHand: string;
    choosePlayableDeckOrDiscard: string;
    choosePlayableDiscard: string;
    choosePlayableDeck: string;
    choosePlayableDeckOrDiscardFull: string;
    choosePlayablePossessionDeck: string;
    chooseTakeToHand: string;
    choosePutOnDeck: string;
    chooseDeadPileCharacter: string;
    exchangePathSite: string;
    replaceRegionSite: string;
    chooseAdventureSite: string;
    chooseAdventureSiteExchange: string;
    chooseNextAdventureSite: string;
    chooseAdventureSiteTerrain: (terrain: string) => string;
    stackMinionOnControlled: string;
    stackChosenMinionOnControlled: string;
    playOnSite: string;
    discardPossessionOrCondition: string;
    discardUnboundPrevent: string;
    discardConditionInPlay: string;
    exertMinionToPlay: string;
    exertMinionThenSite: string;
    exertCharacterToPlay: string;
    discardHandExact: (n: number) => string;
    discardHandUpTo: (n: number) => string;
    discardHandProgress: (picked: number, need: number) => string;
    discardHandRemaining: (n: number) => string;
    validateDiscard: string;
    chooseMulti: (n: number, noun: string) => string;
    chooseWoundedPerCulture: (n: number) => string;
    multiProgress: (remaining: number, picked: number, need: number) => string;
    cultureProgress: (remaining: number, picked: number, need: number) => string;
    toilPrompt: (amount: number, baseCost: number) => string;
    toilProgress: (picked: number, reduced: number, baseCost: number) => string;
    validateToil: string;
    sanctuaryStart: string;
    sanctuaryRemaining: (n: number) => string;
    validateHeals: string;
    healNothing: string;
    archeryFp: string;
    archeryShadow: string;
    threatWoundOne: string;
    threatWoundMany: (n: number) => string;
    siteWoundOne: string;
    siteWoundMany: (n: number) => string;
    skirmishSelect: string;
    revealedOpponentHand: string;
    yourHandRevealed: string;
    yourDiscard: string;
    revealedCards: string;
    revealHandMayDiscard: string;
    revealHandConsult: string;
    revealHandOpponentWaiting: string;
    revealTopDeck: string;
    discardPileTitle: string;
    drawDeckTitle: string;
    deadPileTitle: string;
    deckOrDiscardTitle: string;
    deadPileRemoveSubtitle: string;
    stackPlayHint: string;
    browseDeckDiscardPlayable: string;
};

const fr: TargetingMessages = {
    chooseTarget: 'Choisissez une cible.',
    chooseBearer: 'Choisissez le porteur de cette carte.',
    chooseCardToPlay: 'Choisissez la carte à jouer.',
    chooseCardToPlayHand: 'Choisissez la carte à jouer dans votre main.',
    choosePlayableDeckOrDiscard:
        'Choisissez une carte jouable dans la pioche ou la défausse',
    choosePlayableDiscard: 'Choisissez une carte jouable dans votre défausse.',
    choosePlayableDeck: 'Choisissez une carte jouable dans votre pioche.',
    choosePlayableDeckOrDiscardFull:
        'Choisissez une carte jouable dans votre pioche ou votre défausse.',
    choosePlayablePossessionDeck:
        'Choisissez une possession jouable dans votre pioche.',
    chooseTakeToHand: 'Choisissez une carte à prendre dans votre main.',
    choosePutOnDeck:
        'Choisissez une carte à placer sur le dessus de votre pioche.',
    chooseDeadPileCharacter:
        'Choisissez un personnage à jouer depuis votre pile de mort.',
    exchangePathSite: 'Choisissez un de vos sites du chemin à échanger.',
    replaceRegionSite:
        'Choisissez un site de la région actuelle à remplacer.',
    chooseAdventureSite: 'Choisissez un site dans votre deck d’aventure.',
    chooseAdventureSiteExchange:
        'Choisissez un site de votre deck d’aventure à échanger.',
    chooseNextAdventureSite:
        'Choisissez le prochain site dans votre deck d’aventure.',
    chooseAdventureSiteTerrain: (terrain) =>
        `Choisissez un site ${terrain} dans votre deck d’aventure.`,
    stackMinionOnControlled:
        'Choisissez un site que vous contrôlez pour y empiler ce séide.',
    stackChosenMinionOnControlled:
        'Choisissez un site que vous contrôlez pour y empiler le séide choisi.',
    playOnSite: 'Choisissez un site pour y jouer cette carte.',
    discardPossessionOrCondition: 'Défaussez une possession ou une situation.',
    discardUnboundPrevent: 'Défaussez un compagnon dissocié pour empêcher.',
    discardConditionInPlay: 'Défaussez une situation en jeu.',
    exertMinionToPlay: 'Affaiblissez un séide pour jouer cette carte.',
    exertMinionThenSite: 'Affaiblissez un séide, puis choisissez un site.',
    exertCharacterToPlay:
        'Affaiblissez un personnage pour jouer cette carte.',
    discardHandExact: (n) =>
        `Défaussez ${n} carte${n > 1 ? 's' : ''} de votre main.`,
    discardHandUpTo: (n) =>
        `Défaussez jusqu’à ${n} carte${n > 1 ? 's' : ''} de votre main.`,
    discardHandProgress: (picked, need) =>
        picked >= need
            ? `${picked}/${need} — validez pour défausser.`
            : `${picked}/${need} choisie${picked > 1 ? 's' : ''}. Validez ou cliquez encore.`,
    discardHandRemaining: (n) =>
        `Encore ${n} carte${n > 1 ? 's' : ''}.`,
    validateDiscard: 'Valider la défausse',
    chooseMulti: (n, noun) => `Choisissez ${n} ${noun}.`,
    chooseWoundedPerCulture: (n) =>
        `Choisissez un compagnon blessé de chaque culture (${n}).`,
    multiProgress: (remaining, picked, need) =>
        `Encore ${remaining} (${picked}/${need}).`,
    cultureProgress: (remaining, picked, need) =>
        `Encore ${remaining} culture${remaining > 1 ? 's' : ''} (${picked}/${need}).`,
    toilPrompt: (amount, baseCost) =>
        `Éreintement ${amount} : affaiblissez des personnages de la même culture (−${amount} crépuscule chacun). Coût actuel ${baseCost}. Validez pour continuer (ou sans affaiblir).`,
    toilProgress: (picked, reduced, baseCost) =>
        `${picked} affaibli${picked > 1 ? 's' : ''} → coût ${reduced} (base ${baseCost}). Validez ou continuez.`,
    validateToil: 'Valider l’éreintement',
    sanctuaryStart:
        'Sanctuaire : cliquez un compagnon pour soigner 1 blessure (jusqu’à 5).',
    sanctuaryRemaining: (n) =>
        `Sanctuaire : encore ${n} soin(s). Cliquez un compagnon ou validez.`,
    validateHeals: 'Valider les soins',
    healNothing: 'Ne rien soigner',
    archeryFp:
        "Tir d'archerie : Cliquez sur un compagnon pour lui assigner une blessure.",
    archeryShadow:
        "Tir d'archerie : Cliquez sur un séide pour lui assigner une blessure.",
    threatWoundOne:
        'Menaces : cliquez sur un compagnon pour lui assigner 1 blessure.',
    threatWoundMany: (n) =>
        `Menaces : cliquez sur un compagnon pour lui assigner une blessure (${n} restantes).`,
    siteWoundOne:
        'Site : cliquez sur un de vos personnages pour lui assigner 1 blessure.',
    siteWoundMany: (n) =>
        `Site : cliquez sur un de vos personnages (${n} blessures restantes).`,
    skirmishSelect:
        'Escarmouche : Cliquez sur un groupe pour résoudre son combat.',
    revealedOpponentHand: 'Main adverse révélée',
    yourHandRevealed: 'Votre main est révélée',
    yourDiscard: 'Votre défausse',
    revealedCards: 'Cartes révélées',
    revealHandMayDiscard:
        'Cliquez une carte pour la défausser, ou validez sans défausser dans le toaster.',
    revealHandConsult: 'Consultez les cartes puis validez dans le toaster.',
    revealHandOpponentWaiting: 'L’adversaire consulte votre main…',
    revealTopDeck:
        'Cartes du dessus de la pioche adverse. Validez dans le toaster pour appliquer menaces / jetons et mélanger.',
    discardPileTitle: 'Défausse',
    drawDeckTitle: 'Pioche',
    deadPileTitle: 'Pile de mort',
    deckOrDiscardTitle: 'Pioche ou défausse',
    deadPileRemoveSubtitle:
        'Placez une carte de votre pile de mort hors jeu (retirée du jeu).',
    stackPlayHint:
        'Glissez un séide empilé vers le champ, ou ouvrez ×N pour choisir dans la grille.',
    browseDeckDiscardPlayable:
        'Parcourez votre pioche et votre défausse, puis choisissez une carte jouable.',
};

const en: TargetingMessages = {
    chooseTarget: 'Choose a target.',
    chooseBearer: 'Choose the bearer of this card.',
    chooseCardToPlay: 'Choose the card to play.',
    chooseCardToPlayHand: 'Choose the card to play from your hand.',
    choosePlayableDeckOrDiscard:
        'Choose a playable card from the draw deck or discard pile',
    choosePlayableDiscard: 'Choose a playable card from your discard pile.',
    choosePlayableDeck: 'Choose a playable card from your draw deck.',
    choosePlayableDeckOrDiscardFull:
        'Choose a playable card from your draw deck or discard pile.',
    choosePlayablePossessionDeck:
        'Choose a playable possession from your draw deck.',
    chooseTakeToHand: 'Choose a card to take into your hand.',
    choosePutOnDeck: 'Choose a card to place on top of your draw deck.',
    chooseDeadPileCharacter:
        'Choose a character to play from your dead pile.',
    exchangePathSite: 'Choose one of your path sites to exchange.',
    replaceRegionSite: 'Choose a site in the current region to replace.',
    chooseAdventureSite: 'Choose a site from your adventure deck.',
    chooseAdventureSiteExchange:
        'Choose a site from your adventure deck to exchange.',
    chooseNextAdventureSite:
        'Choose the next site from your adventure deck.',
    chooseAdventureSiteTerrain: (terrain) =>
        `Choose a ${terrain} site from your adventure deck.`,
    stackMinionOnControlled:
        'Choose a site you control to stack this minion on.',
    stackChosenMinionOnControlled:
        'Choose a site you control to stack the chosen minion on.',
    playOnSite: 'Choose a site to play this card on.',
    discardPossessionOrCondition: 'Discard a possession or a condition.',
    discardUnboundPrevent: 'Discard an unbound companion to prevent.',
    discardConditionInPlay: 'Discard a condition in play.',
    exertMinionToPlay: 'Exert a minion to play this card.',
    exertMinionThenSite: 'Exert a minion, then choose a site.',
    exertCharacterToPlay: 'Exert a character to play this card.',
    discardHandExact: (n) =>
        `Discard ${n} card${n > 1 ? 's' : ''} from your hand.`,
    discardHandUpTo: (n) =>
        `Discard up to ${n} card${n > 1 ? 's' : ''} from your hand.`,
    discardHandProgress: (picked, need) =>
        picked >= need
            ? `${picked}/${need} — confirm to discard.`
            : `${picked}/${need} chosen. Confirm or click again.`,
    discardHandRemaining: (n) =>
        `${n} card${n > 1 ? 's' : ''} still needed.`,
    validateDiscard: 'Confirm discard',
    chooseMulti: (n, noun) => `Choose ${n} ${noun}.`,
    chooseWoundedPerCulture: (n) =>
        `Choose one wounded companion of each culture (${n}).`,
    multiProgress: (remaining, picked, need) =>
        `${remaining} remaining (${picked}/${need}).`,
    cultureProgress: (remaining, picked, need) =>
        `${remaining} culture${remaining > 1 ? 's' : ''} left (${picked}/${need}).`,
    toilPrompt: (amount, baseCost) =>
        `Toil ${amount}: exert characters of the same culture (−${amount} Twilight each). Current cost ${baseCost}. Confirm to continue (or without exerting).`,
    toilProgress: (picked, reduced, baseCost) =>
        `${picked} exerted → cost ${reduced} (base ${baseCost}). Confirm or continue.`,
    validateToil: 'Confirm toil',
    sanctuaryStart:
        'Sanctuary: click a companion to heal 1 wound (up to 5).',
    sanctuaryRemaining: (n) =>
        `Sanctuary: ${n} heal(s) left. Click a companion or confirm.`,
    validateHeals: 'Confirm heals',
    healNothing: 'Heal nothing',
    archeryFp: 'Archery: Click a companion to assign a wound.',
    archeryShadow: 'Archery: Click a minion to assign a wound.',
    threatWoundOne: 'Threats: click a companion to assign 1 wound.',
    threatWoundMany: (n) =>
        `Threats: click a companion to assign a wound (${n} remaining).`,
    siteWoundOne:
        'Site: click one of your characters to assign 1 wound.',
    siteWoundMany: (n) =>
        `Site: click one of your characters (${n} wounds remaining).`,
    skirmishSelect: 'Skirmish: Click a group to resolve its combat.',
    revealedOpponentHand: 'Opponent’s hand revealed',
    yourHandRevealed: 'Your hand is revealed',
    yourDiscard: 'Your discard pile',
    revealedCards: 'Revealed cards',
    revealHandMayDiscard:
        'Click a card to discard it, or confirm without discarding in the toaster.',
    revealHandConsult: 'Review the cards, then confirm in the toaster.',
    revealHandOpponentWaiting: 'Your opponent is reviewing your hand…',
    revealTopDeck:
        'Top cards of the opponent’s draw deck. Confirm in the toaster to apply threats / tokens and shuffle.',
    discardPileTitle: 'Discard pile',
    drawDeckTitle: 'Draw deck',
    deadPileTitle: 'Dead pile',
    deckOrDiscardTitle: 'Draw deck or discard pile',
    deadPileRemoveSubtitle:
        'Place a card from your dead pile out of play (removed from the game).',
    stackPlayHint:
        'Drag a stacked minion to the battlefield, or open ×N to pick from the grid.',
    browseDeckDiscardPlayable:
        'Browse your draw deck and discard pile, then choose a playable card.',
};

const de: TargetingMessages = {
    chooseTarget: 'Wähle ein Ziel.',
    chooseBearer: 'Wähle den Träger dieser Karte.',
    chooseCardToPlay: 'Wähle die zu spielende Karte.',
    chooseCardToPlayHand: 'Wähle die Karte aus deiner Hand zum Spielen.',
    choosePlayableDeckOrDiscard:
        'Wähle eine spielbare Karte aus Nachzieh- oder Ablagestapel',
    choosePlayableDiscard: 'Wähle eine spielbare Karte aus deinem Ablagestapel.',
    choosePlayableDeck: 'Wähle eine spielbare Karte aus deinem Nachziehstapel.',
    choosePlayableDeckOrDiscardFull:
        'Wähle eine spielbare Karte aus deinem Nachzieh- oder Ablagestapel.',
    choosePlayablePossessionDeck:
        'Wähle einen spielbaren Besitz aus deinem Nachziehstapel.',
    chooseTakeToHand: 'Wähle eine Karte auf die Hand.',
    choosePutOnDeck: 'Wähle eine Karte oben auf deinen Nachziehstapel.',
    chooseDeadPileCharacter:
        'Wähle einen Charakter aus deinem Friedhof zum Spielen.',
    exchangePathSite: 'Wähle einen deiner Orte auf dem Pfad zum Tausch.',
    replaceRegionSite: 'Wähle einen Ort der aktuellen Region zum Ersetzen.',
    chooseAdventureSite: 'Wähle einen Ort aus deinem Abenteuerdeck.',
    chooseAdventureSiteExchange:
        'Wähle einen Ort aus deinem Abenteuerdeck zum Tausch.',
    chooseNextAdventureSite:
        'Wähle den nächsten Ort aus deinem Abenteuerdeck.',
    chooseAdventureSiteTerrain: (terrain) =>
        `Wähle einen ${terrain}-Ort aus deinem Abenteuerdeck.`,
    stackMinionOnControlled:
        'Wähle einen von dir kontrollierten Ort, um diesen Diener darauf zu stapeln.',
    stackChosenMinionOnControlled:
        'Wähle einen von dir kontrollierten Ort, um den gewählten Diener darauf zu stapeln.',
    playOnSite: 'Wähle einen Ort, um diese Karte dort zu spielen.',
    discardPossessionOrCondition: 'Lege einen Besitz oder Zustand ab.',
    discardUnboundPrevent:
        'Lege einen ungebundenen Gefährten ab, um zu verhindern.',
    discardConditionInPlay: 'Lege einen Zustand im Spiel ab.',
    exertMinionToPlay: 'Spanne einen Diener an, um diese Karte zu spielen.',
    exertMinionThenSite: 'Spanne einen Diener an, dann wähle einen Ort.',
    exertCharacterToPlay:
        'Spanne einen Charakter an, um diese Karte zu spielen.',
    discardHandExact: (n) =>
        `Lege ${n} Karte${n > 1 ? 'n' : ''} aus deiner Hand ab.`,
    discardHandUpTo: (n) =>
        `Lege bis zu ${n} Karte${n > 1 ? 'n' : ''} aus deiner Hand ab.`,
    discardHandProgress: (picked, need) =>
        picked >= need
            ? `${picked}/${need} — bestätige zum Ablegen.`
            : `${picked}/${need} gewählt. Bestätige oder klicke weiter.`,
    discardHandRemaining: (n) =>
        `Noch ${n} Karte${n > 1 ? 'n' : ''}.`,
    validateDiscard: 'Ablage bestätigen',
    chooseMulti: (n, noun) => `Wähle ${n} ${noun}.`,
    chooseWoundedPerCulture: (n) =>
        `Wähle einen verwundeten Gefährten jeder Kultur (${n}).`,
    multiProgress: (remaining, picked, need) =>
        `Noch ${remaining} (${picked}/${need}).`,
    cultureProgress: (remaining, picked, need) =>
        `Noch ${remaining} Kultur${remaining > 1 ? 'en' : ''} (${picked}/${need}).`,
    toilPrompt: (amount, baseCost) =>
        `Mühsal ${amount}: Spanne Charaktere derselben Kultur an (−${amount} Einfluss je). Aktuelle Kosten ${baseCost}. Bestätige zum Fortfahren (oder ohne Anspannen).`,
    toilProgress: (picked, reduced, baseCost) =>
        `${picked} angespannt → Kosten ${reduced} (Basis ${baseCost}). Bestätige oder weiter.`,
    validateToil: 'Mühsal bestätigen',
    sanctuaryStart:
        'Zuflucht: Klicke einen Gefährten, um 1 Wunde zu heilen (bis 5).',
    sanctuaryRemaining: (n) =>
        `Zuflucht: noch ${n} Heilung(en). Klicke einen Gefährten oder bestätige.`,
    validateHeals: 'Heilungen bestätigen',
    healNothing: 'Nichts heilen',
    archeryFp:
        'Fernkampf: Klicke einen Gefährten, um eine Wunde zuzuweisen.',
    archeryShadow:
        'Fernkampf: Klicke einen Diener, um eine Wunde zuzuweisen.',
    threatWoundOne:
        'Bedrohungen: Klicke einen Gefährten, um 1 Wunde zuzuweisen.',
    threatWoundMany: (n) =>
        `Bedrohungen: Klicke einen Gefährten, um eine Wunde zuzuweisen (${n} übrig).`,
    siteWoundOne:
        'Ort: Klicke einen deiner Charaktere, um 1 Wunde zuzuweisen.',
    siteWoundMany: (n) =>
        `Ort: Klicke einen deiner Charaktere (${n} Wunden übrig).`,
    skirmishSelect:
        'Kampf: Klicke eine Gruppe, um ihren Kampf zu lösen.',
    revealedOpponentHand: 'Gegnerische Hand aufgedeckt',
    yourHandRevealed: 'Deine Hand ist aufgedeckt',
    yourDiscard: 'Dein Ablagestapel',
    revealedCards: 'Aufgedeckte Karten',
    revealHandMayDiscard:
        'Klicke eine Karte zum Ablegen, oder bestätige ohne Ablegen im Toaster.',
    revealHandConsult: 'Sieh die Karten an und bestätige im Toaster.',
    revealHandOpponentWaiting: 'Dein Gegner sieht deine Hand an…',
    revealTopDeck:
        'Oberste Karten des gegnerischen Nachziehstapels. Bestätige im Toaster, um Bedrohungen / Marker anzuwenden und zu mischen.',
    discardPileTitle: 'Ablagestapel',
    drawDeckTitle: 'Nachziehstapel',
    deadPileTitle: 'Friedhof',
    deckOrDiscardTitle: 'Nachzieh- oder Ablagestapel',
    deadPileRemoveSubtitle:
        'Lege eine Karte aus deinem Friedhof aus dem Spiel (entfernt).',
    stackPlayHint:
        'Ziehe einen gestapelten Diener aufs Feld, oder öffne ×N zur Auswahl im Raster.',
    browseDeckDiscardPlayable:
        'Durchsuche Nachzieh- und Ablagestapel und wähle eine spielbare Karte.',
};

const it: TargetingMessages = {
    chooseTarget: 'Scegli un bersaglio.',
    chooseBearer: 'Scegli il portatore di questa carta.',
    chooseCardToPlay: 'Scegli la carta da giocare.',
    chooseCardToPlayHand: 'Scegli la carta da giocare dalla tua mano.',
    choosePlayableDeckOrDiscard:
        'Scegli una carta giocabile dal mazzo o dagli scarti',
    choosePlayableDiscard: 'Scegli una carta giocabile dai tuoi scarti.',
    choosePlayableDeck: 'Scegli una carta giocabile dal tuo mazzo.',
    choosePlayableDeckOrDiscardFull:
        'Scegli una carta giocabile dal tuo mazzo o dai tuoi scarti.',
    choosePlayablePossessionDeck:
        'Scegli un possesso giocabile dal tuo mazzo.',
    chooseTakeToHand: 'Scegli una carta da prendere in mano.',
    choosePutOnDeck: 'Scegli una carta da mettere in cima al mazzo.',
    chooseDeadPileCharacter:
        'Scegli un personaggio da giocare dalla pila dei morti.',
    exchangePathSite: 'Scegli uno dei tuoi siti del percorso da scambiare.',
    replaceRegionSite: 'Scegli un sito della regione attuale da sostituire.',
    chooseAdventureSite: 'Scegli un sito dal tuo mazzo d’avventura.',
    chooseAdventureSiteExchange:
        'Scegli un sito dal tuo mazzo d’avventura da scambiare.',
    chooseNextAdventureSite:
        'Scegli il prossimo sito dal tuo mazzo d’avventura.',
    chooseAdventureSiteTerrain: (terrain) =>
        `Scegli un sito ${terrain} dal tuo mazzo d’avventura.`,
    stackMinionOnControlled:
        'Scegli un sito che controlli su cui impilare questo servitore.',
    stackChosenMinionOnControlled:
        'Scegli un sito che controlli su cui impilare il servitore scelto.',
    playOnSite: 'Scegli un sito su cui giocare questa carta.',
    discardPossessionOrCondition: 'Scarta un possesso o una condizione.',
    discardUnboundPrevent:
        'Scarta un compagno non vincolato per impedire.',
    discardConditionInPlay: 'Scarta una condizione in gioco.',
    exertMinionToPlay: 'Affatica un servitore per giocare questa carta.',
    exertMinionThenSite: 'Affatica un servitore, poi scegli un sito.',
    exertCharacterToPlay:
        'Affatica un personaggio per giocare questa carta.',
    discardHandExact: (n) =>
        `Scarta ${n} carta${n > 1 ? 'e' : ''} dalla tua mano.`,
    discardHandUpTo: (n) =>
        `Scarta fino a ${n} carta${n > 1 ? 'e' : ''} dalla tua mano.`,
    discardHandProgress: (picked, need) =>
        picked >= need
            ? `${picked}/${need} — conferma per scartare.`
            : `${picked}/${need} scelte. Conferma o clicca ancora.`,
    discardHandRemaining: (n) =>
        `Ancora ${n} carta${n > 1 ? 'e' : ''}.`,
    validateDiscard: 'Conferma scarto',
    chooseMulti: (n, noun) => `Scegli ${n} ${noun}.`,
    chooseWoundedPerCulture: (n) =>
        `Scegli un compagno ferito di ogni cultura (${n}).`,
    multiProgress: (remaining, picked, need) =>
        `Ancora ${remaining} (${picked}/${need}).`,
    cultureProgress: (remaining, picked, need) =>
        `Ancora ${remaining} cultur${remaining > 1 ? 'e' : 'a'} (${picked}/${need}).`,
    toilPrompt: (amount, baseCost) =>
        `Fatica ${amount}: affatica personaggi della stessa cultura (−${amount} crepuscolo ciascuno). Costo attuale ${baseCost}. Conferma per continuare (o senza affaticare).`,
    toilProgress: (picked, reduced, baseCost) =>
        `${picked} affaticati → costo ${reduced} (base ${baseCost}). Conferma o continua.`,
    validateToil: 'Conferma fatica',
    sanctuaryStart:
        'Santuario: clicca un compagno per curare 1 ferita (fino a 5).',
    sanctuaryRemaining: (n) =>
        `Santuario: ancora ${n} cura/e. Clicca un compagno o conferma.`,
    validateHeals: 'Conferma cure',
    healNothing: 'Non curare',
    archeryFp: 'Tiro: clicca un compagno per assegnare una ferita.',
    archeryShadow: 'Tiro: clicca un servitore per assegnare una ferita.',
    threatWoundOne:
        'Minacce: clicca un compagno per assegnare 1 ferita.',
    threatWoundMany: (n) =>
        `Minacce: clicca un compagno per assegnare una ferita (${n} rimanenti).`,
    siteWoundOne:
        'Sito: clicca uno dei tuoi personaggi per assegnare 1 ferita.',
    siteWoundMany: (n) =>
        `Sito: clicca uno dei tuoi personaggi (${n} ferite rimanenti).`,
    skirmishSelect:
        'Schermaglia: clicca un gruppo per risolvere il combattimento.',
    revealedOpponentHand: 'Mano avversaria rivelata',
    yourHandRevealed: 'La tua mano è rivelata',
    yourDiscard: 'I tuoi scarti',
    revealedCards: 'Carte rivelate',
    revealHandMayDiscard:
        'Clicca una carta per scartarla, o conferma senza scartare nel toaster.',
    revealHandConsult: 'Consulta le carte, poi conferma nel toaster.',
    revealHandOpponentWaiting: 'L’avversario consulta la tua mano…',
    revealTopDeck:
        'Carte in cima al mazzo avversario. Conferma nel toaster per applicare minacce / gettoni e mescolare.',
    discardPileTitle: 'Scarti',
    drawDeckTitle: 'Mazzo',
    deadPileTitle: 'Pila dei morti',
    deckOrDiscardTitle: 'Mazzo o scarti',
    deadPileRemoveSubtitle:
        'Metti una carta dalla pila dei morti fuori dal gioco (rimossa).',
    stackPlayHint:
        'Trascina un servitore impilato sul campo, oppure apri ×N per scegliere nella griglia.',
    browseDeckDiscardPlayable:
        'Sfoglia mazzo e scarti, poi scegli una carta giocabile.',
};

const es: TargetingMessages = {
    chooseTarget: 'Elige un objetivo.',
    chooseBearer: 'Elige el portador de esta carta.',
    chooseCardToPlay: 'Elige la carta que jugar.',
    chooseCardToPlayHand: 'Elige la carta que jugar de tu mano.',
    choosePlayableDeckOrDiscard:
        'Elige una carta jugable del mazo o del descarte',
    choosePlayableDiscard: 'Elige una carta jugable de tu descarte.',
    choosePlayableDeck: 'Elige una carta jugable de tu mazo.',
    choosePlayableDeckOrDiscardFull:
        'Elige una carta jugable de tu mazo o de tu descarte.',
    choosePlayablePossessionDeck:
        'Elige una posesión jugable de tu mazo.',
    chooseTakeToHand: 'Elige una carta para tomar en tu mano.',
    choosePutOnDeck: 'Elige una carta para poner encima de tu mazo.',
    chooseDeadPileCharacter:
        'Elige un personaje que jugar desde tu cementerio.',
    exchangePathSite: 'Elige uno de tus sitios del camino para intercambiar.',
    replaceRegionSite: 'Elige un sitio de la región actual para reemplazar.',
    chooseAdventureSite: 'Elige un sitio de tu mazo de aventura.',
    chooseAdventureSiteExchange:
        'Elige un sitio de tu mazo de aventura para intercambiar.',
    chooseNextAdventureSite:
        'Elige el siguiente sitio de tu mazo de aventura.',
    chooseAdventureSiteTerrain: (terrain) =>
        `Elige un sitio ${terrain} de tu mazo de aventura.`,
    stackMinionOnControlled:
        'Elige un sitio que controles para apilar este esbirro.',
    stackChosenMinionOnControlled:
        'Elige un sitio que controles para apilar el esbirro elegido.',
    playOnSite: 'Elige un sitio donde jugar esta carta.',
    discardPossessionOrCondition: 'Descarta una posesión o una condición.',
    discardUnboundPrevent:
        'Descarta un compañero no vinculado para impedir.',
    discardConditionInPlay: 'Descarta una condición en juego.',
    exertMinionToPlay: 'Agota un esbirro para jugar esta carta.',
    exertMinionThenSite: 'Agota un esbirro, luego elige un sitio.',
    exertCharacterToPlay: 'Agota un personaje para jugar esta carta.',
    discardHandExact: (n) =>
        `Descarta ${n} carta${n > 1 ? 's' : ''} de tu mano.`,
    discardHandUpTo: (n) =>
        `Descarta hasta ${n} carta${n > 1 ? 's' : ''} de tu mano.`,
    discardHandProgress: (picked, need) =>
        picked >= need
            ? `${picked}/${need} — valida para descartar.`
            : `${picked}/${need} elegida${picked > 1 ? 's' : ''}. Valida o haz clic otra vez.`,
    discardHandRemaining: (n) =>
        `Aún ${n} carta${n > 1 ? 's' : ''}.`,
    validateDiscard: 'Validar el descarte',
    chooseMulti: (n, noun) => `Elige ${n} ${noun}.`,
    chooseWoundedPerCulture: (n) =>
        `Elige un compañero herido de cada cultura (${n}).`,
    multiProgress: (remaining, picked, need) =>
        `Aún ${remaining} (${picked}/${need}).`,
    cultureProgress: (remaining, picked, need) =>
        `Aún ${remaining} cultura${remaining > 1 ? 's' : ''} (${picked}/${need}).`,
    toilPrompt: (amount, baseCost) =>
        `Fatiga ${amount}: agota personajes de la misma cultura (−${amount} crepúsculo cada uno). Coste actual ${baseCost}. Valida para continuar (o sin agotar).`,
    toilProgress: (picked, reduced, baseCost) =>
        `${picked} agotado${picked > 1 ? 's' : ''} → coste ${reduced} (base ${baseCost}). Valida o continúa.`,
    validateToil: 'Validar fatiga',
    sanctuaryStart:
        'Santuario: haz clic en un compañero para curar 1 herida (hasta 5).',
    sanctuaryRemaining: (n) =>
        `Santuario: aún ${n} cura(s). Haz clic en un compañero o valida.`,
    validateHeals: 'Validar curas',
    healNothing: 'No curar',
    archeryFp: 'Arquería: haz clic en un compañero para asignar una herida.',
    archeryShadow: 'Arquería: haz clic en un esbirro para asignar una herida.',
    threatWoundOne:
        'Amenazas: haz clic en un compañero para asignar 1 herida.',
    threatWoundMany: (n) =>
        `Amenazas: haz clic en un compañero para asignar una herida (${n} restantes).`,
    siteWoundOne:
        'Sitio: haz clic en uno de tus personajes para asignar 1 herida.',
    siteWoundMany: (n) =>
        `Sitio: haz clic en uno de tus personajes (${n} heridas restantes).`,
    skirmishSelect:
        'Escaramuza: haz clic en un grupo para resolver su combate.',
    revealedOpponentHand: 'Mano rival revelada',
    yourHandRevealed: 'Tu mano está revelada',
    yourDiscard: 'Tu descarte',
    revealedCards: 'Cartas reveladas',
    revealHandMayDiscard:
        'Haz clic en una carta para descartarla, o valida sin descartar en el toaster.',
    revealHandConsult: 'Consulta las cartas y valida en el toaster.',
    revealHandOpponentWaiting: 'El rival consulta tu mano…',
    revealTopDeck:
        'Cartas de encima del mazo rival. Valida en el toaster para aplicar amenazas / fichas y barajar.',
    discardPileTitle: 'Descarte',
    drawDeckTitle: 'Mazo',
    deadPileTitle: 'Cementerio',
    deckOrDiscardTitle: 'Mazo o descarte',
    deadPileRemoveSubtitle:
        'Coloca una carta de tu cementerio fuera de juego (retirada).',
    stackPlayHint:
        'Arrastra un esbirro apilado al campo, o abre ×N para elegir en la rejilla.',
    browseDeckDiscardPlayable:
        'Recorre tu mazo y descarte, luego elige una carta jugable.',
};

export const TARGETING_MESSAGES: Record<
    SupportedLanguage,
    TargetingMessages
> = { fr, en, de, it, es };
