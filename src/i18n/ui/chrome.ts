import type { SupportedLanguage } from '../languages';

/** Chrome plateau : phases, bandeau, toaster, rail, overlays. */
export type ChromeMessages = {
    phases: {
        setup: string;
        fellowship: string;
        shadow: string;
        maneuver: string;
        archery: string;
        assignment: string;
        skirmish: string;
        regroup: string;
        /** Libellés courts bandeau (Compagnie, Ombre…). */
        short: {
            setup: string;
            fellowship: string;
            shadow: string;
            maneuver: string;
            archery: string;
            assignment: string;
            skirmish: string;
            regroup: string;
        };
    };
    banner: {
        phase: string;
        activePlayer: string;
        endFellowship: string;
        endShadow: string;
        validateShadowHand: string;
        moveToSite: string;
        endTurn: string;
        validateHandEndTurn: string;
    };
    common: {
        pass: string;
        cancel: string;
        confirm: string;
        activateEffect: string;
        close: string;
        you: string;
        freePeoples: string;
        shadow: string;
        waitingFor: (name: string) => string;
        escapeToCancel: string;
        /** Libellé de la réserve (rail). */
        twilightPool: string;
        /** Mot « crépuscule / twilight… » (singulier). */
        twilight: string;
        /** Pluriel si la langue en a un distinct. */
        twilights: string;
    };
    toast: {
        actionRequired: string;
        burdenBid: string;
        burdenBidBody: string;
        chooseFirst: string;
        chooseFirstWin: string;
        chooseFirstWait: string;
        mulligan: string;
        mulliganBody: string;
        mulliganWait: string;
        muster: string;
        forcedChoice: string;
        chooseOption: string;
        exert: string;
        discard: string;
        siteEffect: string;
        siteEffectLeft: string;
        siteEffectOptional: string;
        siteFollowerExert: string;
        startOfPhase: string;
        response: string;
        startOfSkirmish: string;
        eachTime: string;
        whenYouPlay: string;
        optionalEffect: string;
        reveal: string;
        threats: string;
        siteWounds: string;
        yourTurnToRespond: string;
        yourTurnToAct: string;
        respondOrPass: string;
        actOrPass: string;
        siteChoice: string;
        siteChoiceN: (n: number) => string;
        shadowRefill: string;
        fpRefill: string;
        assignment: string;
        stack: string;
        replaceSite: string;
        playOnSite: string;
        stackOnSite: string;
        playFromStack: string;
        sanctuary: string;
        chooseTarget: string;
        pendingCard: string;
        playFirstFp: string;
        playSecondShadow: string;
        keepHand: string;
        mulliganDraw: string;
        validateDrawn: (n: number) => string;
        ignoreMuster: string;
        endStartOfPhase: string;
        validate: string;
        proceedToSkirmishes: string;
        validateWithoutDiscard: string;
        validateReveal: string;
        preventTwilight: (n: number) => string;
        preventBurdens: (n: number) => string;
        preventDiscardUnbound: string;
        preventExertCompanion: string;
        preventWoundBearer: string;
        passPlayNothing: string;
        leaveShadowAssign: string;
        assignRemaining: string;
        discardPossessionOrCondition: string;
        fpChooseDiscard: string;
        shadowChooseCondition: string;
        discardConditionInPlay: string;
        gameInProgress: string;
    };
    bidding: {
        bidRecorded: (pointsLabel: string) => string;
        waitingSuffix: (name: string) => string;
        placeBid: (pointsLabel: string) => string;
    };
    pointsFardeau: (n: number) => string;
    rail: {
        drawDeck: string;
        drawDeckTitle: string;
        discard: string;
        cemetery: string;
        removed: (n: number) => string;
        threatOne: string;
        threats: (n: number) => string;
        threatLimit: (n: number) => string;
        advPrefix: string;
        empty: string;
        cardsCount: (n: number) => string;
        initiative: string;
        initiativeTitle: string;
        journal: string;
        chat: string;
        filterFeed: string;
        chatMessages: string;
        gameJournal: string;
        noChat: string;
        writePlaceholder: string;
        chatUnavailable: string;
        chatMessageAria: string;
        send: string;
        playerFallback: (id: string) => string;
    };
    overlay: {
        emptyPile: string;
        noCards: string;
        cardsOrder: (n: number) => string;
        cardsPick: (n: number) => string;
        copies: (n: number) => string;
        myDiscard: string;
        myCemetery: string;
        opponentDiscard: string;
        opponentCemetery: string;
        myRemoved: string;
        opponentRemoved: string;
        deckOrDiscard: string;
        deck: string;
        yourDiscard: string;
        revealedCards: string;
        opponentHandRevealed: string;
    };
    gameEnd: {
        youWin: string;
        namedWins: (name: string) => string;
        newGame: string;
        watchBoard: string;
        siteNine: (name: string, female: boolean) => string;
        corruption: (name: string, female: boolean) => string;
        ringBearerKilled: (name: string) => string;
    };
};

const fr: ChromeMessages = {
    phases: {
        setup: 'Mise en place',
        fellowship: 'Phase de compagnie',
        shadow: "Phase de l'Ombre",
        maneuver: 'Phase de manœuvre',
        archery: "Phase d'archerie",
        assignment: "Phase d'affectation",
        skirmish: 'Phase de combat',
        regroup: 'Phase de ralliement',
        short: {
            setup: 'Mise en place',
            fellowship: 'Compagnie',
            shadow: 'Ombre',
            maneuver: 'Manœuvre',
            archery: 'Archerie',
            assignment: 'Affectation',
            skirmish: 'Combat',
            regroup: 'Ralliement',
        },
    },
    banner: {
        phase: 'Phase :',
        activePlayer: 'Joueur actif :',
        endFellowship: 'Fin de Compagnie ➔',
        endShadow: "Fin de l'Ombre ➔",
        validateShadowHand: 'Valider la main (Ombre) 🃏',
        moveToSite: 'Avancer au site 🏕️',
        endTurn: 'Terminer le tour 🏁',
        validateHandEndTurn: 'Valider la main & Fin de tour 🏁',
    },
    common: {
        pass: 'Passer',
        cancel: 'Annuler',
        confirm: 'Valider',
        activateEffect: 'Activer l’effet',
        close: 'Fermer',
        you: 'Vous',
        freePeoples: 'Peuples Libres',
        shadow: 'Ombre',
        waitingFor: (name) => `En attente de ${name}…`,
        escapeToCancel: ' Échap pour annuler.',
        twilightPool: 'Crépuscule',
        twilight: 'crépuscule',
        twilights: 'crépuscules',
    },
    toast: {
        actionRequired: 'ACTION REQUISE',
        burdenBid: 'ENCHÈRE DE FARDEAUX',
        burdenBidBody:
            'Misez des points-fardeau pour déterminer qui choisira le premier joueur.',
        chooseFirst: 'CHOIX DU PREMIER JOUEUR',
        chooseFirstWin: 'Vous avez gagné l’enchère ! Choisissez votre camp.',
        chooseFirstWait: 'En attente du choix du premier joueur…',
        mulligan: 'PHASE DE MULLIGAN',
        mulliganBody:
            'Examinez votre main de 8 cartes. Voulez-vous la garder ou faire un Mulligan ?',
        mulliganWait: 'En attente de la décision Mulligan…',
        muster: 'PHASE DE RALLIEMENT (MUSTER)',
        forcedChoice: 'CHOIX FORCÉ',
        chooseOption: 'Choisissez une option.',
        exert: 'AFFAIBLIR',
        discard: 'DÉFAUSSE',
        siteEffect: 'EFFET DU SITE',
        siteEffectLeft: 'EFFET DU SITE QUITTÉ',
        siteEffectOptional:
            'Vous pouvez utiliser l’effet optionnel de ce site.',
        siteFollowerExert:
            'Vous pouvez affaiblir un compagnon après le transfert.',
        startOfPhase: 'DÉBUT DE PHASE',
        response: 'RÉPONSE',
        startOfSkirmish: 'DÉBUT DU COMBAT',
        eachTime: 'CHAQUE FOIS',
        whenYouPlay: 'QUAND VOUS JOUEZ',
        optionalEffect: 'EFFET OPTIONNEL',
        reveal: 'RÉVÉLATION',
        threats: 'MENACES',
        siteWounds: 'BLESSURES DU SITE',
        yourTurnToRespond: 'À VOTRE TOUR DE RÉAGIR',
        yourTurnToAct: 'TOUR D’ACTION',
        respondOrPass: 'À votre tour de répondre ou de passer.',
        actOrPass: 'À votre tour d’agir ou de passer.',
        siteChoice: 'CHOIX DU SITE',
        siteChoiceN: (n) => `CHOIX DU SITE ${n}`,
        shadowRefill: 'RECONSTITUTION DE L’OMBRE',
        fpRefill: 'RECONSTITUTION DES PEUPLES LIBRES',
        assignment: 'AFFECTATION',
        stack: 'EMPILER',
        replaceSite: 'REMPLACER UN SITE',
        playOnSite: 'JOUER SUR UN SITE',
        stackOnSite: 'EMPILER SUR UN SITE',
        playFromStack: 'JOUER DEPUIS LA PILE',
        sanctuary: 'SANCTUAIRE',
        chooseTarget: 'CHOIX DE CIBLE',
        pendingCard: 'CARTE EN COURS',
        playFirstFp: 'Jouer Premier (Peuples Libres)',
        playSecondShadow: 'Jouer Second (Ombre)',
        keepHand: 'Garder ma main',
        mulliganDraw: 'Mulligan (8 nouvelles)',
        validateDrawn: (n) =>
            `Valider (${n} piochée${n > 1 ? 's' : ''})`,
        ignoreMuster: 'Ignorer « Rassembleur »',
        endStartOfPhase: 'Terminer le début de phase ➔',
        validate: 'Valider',
        proceedToSkirmishes: 'Passer aux combats',
        validateWithoutDiscard: 'Valider sans défausser',
        validateReveal: 'Valider la révélation',
        preventTwilight: (n) =>
            `Empêcher (−${n} ${n > 1 ? 'crépuscules' : 'crépuscule'})`,
        preventBurdens: (n) =>
            `Empêcher (+${n} fardeau${n > 1 ? 'x' : ''})`,
        preventDiscardUnbound:
            'Empêcher (défausser un compagnon dissocié)',
        preventExertCompanion: 'Empêcher (affaiblir ce compagnon)',
        preventWoundBearer: 'Empêcher (blesser le Porteur)',
        passPlayNothing: 'PASSER (Ne rien jouer)',
        leaveShadowAssign: 'Laissez l’Ombre affecter ses séides…',
        assignRemaining: 'Affectez vos séides restants, ou validez.',
        discardPossessionOrCondition:
            'Défaussez une possession ou une situation.',
        fpChooseDiscard:
            'Les Peuples Libres choisissent une possession ou une situation à défausser…',
        shadowChooseCondition: 'L’Ombre choisit une situation à défausser…',
        discardConditionInPlay: 'Défaussez une situation en jeu.',
        gameInProgress: 'Partie en cours',
    },
    bidding: {
        bidRecorded: (points) => `Mise enregistrée : ${points}`,
        waitingSuffix: (name) => `. En attente de ${name}…`,
        placeBid: (points) => `Miser ${points}`,
    },
    pointsFardeau: (n) =>
        n <= 1 ? `${n} point-fardeau` : `${n} points-fardeau`,
    rail: {
        drawDeck: 'Pioche',
        drawDeckTitle: 'Pioche — face cachée, non consultable',
        discard: 'Défausse',
        cemetery: 'Cimetière',
        removed: (n) => `Retirées du jeu · ${n}`,
        threatOne: '1 menace',
        threats: (n) => `${n} menaces`,
        threatLimit: (n) => `limite ${n} compagnons`,
        advPrefix: 'Adv. ',
        empty: 'vide',
        cardsCount: (n) => `${n} cartes`,
        initiative: 'Initiative',
        initiativeTitle:
            'Le joueur Peuples Libres a l’initiative s’il a au moins 4 cartes en main ; sinon l’Ombre l’a.',
        journal: 'Journal',
        chat: 'Chat',
        filterFeed: 'Filtrer le journal',
        chatMessages: 'Messages de chat',
        gameJournal: 'Journal de la partie',
        noChat: 'Aucun message de chat',
        writePlaceholder: 'Écrire…',
        chatUnavailable: 'Chat indisponible',
        chatMessageAria: 'Message de chat',
        send: 'Envoyer',
        playerFallback: (id) => `Joueur ${id}`,
    },
    overlay: {
        emptyPile: 'Cette pile est vide.',
        noCards: 'Aucune carte',
        cardsOrder: (n) =>
            n === 1
                ? '1 carte · ordre : dernière en haut de pile en premier'
                : `${n} cartes · ordre : dernière en haut de pile en premier`,
        cardsPick: (n) =>
            `${n} carte${n > 1 ? 's' : ''} · choisissez une carte jouable`,
        copies: (n) => `${n} exemplaires`,
        myDiscard: 'Ma défausse',
        myCemetery: 'Mon cimetière',
        opponentDiscard: 'Défausse adverse',
        opponentCemetery: 'Cimetière adverse',
        myRemoved: 'Mes cartes retirées du jeu',
        opponentRemoved: 'Cartes adverses retirées du jeu',
        deckOrDiscard: 'Pioche ou défausse',
        deck: 'Pioche',
        yourDiscard: 'Votre défausse',
        revealedCards: 'Cartes révélées',
        opponentHandRevealed: 'Main adverse révélée',
    },
    gameEnd: {
        youWin: 'Vous remportez la partie',
        namedWins: (name) => `${name} remporte la partie`,
        newGame: 'Nouvelle partie',
        watchBoard: 'Regarder le plateau',
        siteNine: (name, female) =>
            female
                ? `${name}, aidée de ses compagnons, a détruit l’Anneau de Sauron.`
                : `${name}, aidé de ses compagnons, a détruit l’Anneau de Sauron.`,
        corruption: (name, female) =>
            female
                ? `${name} a été corrompue par la volonté de l’Anneau.`
                : `${name} a été corrompu par la volonté de l’Anneau.`,
        ringBearerKilled: (name) =>
            `${name} a succombé à ses blessures.`,
    },
};

const en: ChromeMessages = {
    phases: {
        setup: 'Setup',
        fellowship: 'Fellowship phase',
        shadow: 'Shadow phase',
        maneuver: 'Maneuver phase',
        archery: 'Archery phase',
        assignment: 'Assignment phase',
        skirmish: 'Skirmish phase',
        regroup: 'Regroup phase',
        short: {
            setup: 'Setup',
            fellowship: 'Fellowship',
            shadow: 'Shadow',
            maneuver: 'Maneuver',
            archery: 'Archery',
            assignment: 'Assignment',
            skirmish: 'Skirmish',
            regroup: 'Regroup',
        },
    },
    banner: {
        phase: 'Phase:',
        activePlayer: 'Active player:',
        endFellowship: 'End Fellowship ➔',
        endShadow: 'End Shadow ➔',
        validateShadowHand: 'Confirm hand (Shadow) 🃏',
        moveToSite: 'Move to next site 🏕️',
        endTurn: 'End turn 🏁',
        validateHandEndTurn: 'Confirm hand & End turn 🏁',
    },
    common: {
        pass: 'Pass',
        cancel: 'Cancel',
        confirm: 'Confirm',
        activateEffect: 'Activate effect',
        close: 'Close',
        you: 'You',
        freePeoples: 'Free Peoples',
        shadow: 'Shadow',
        waitingFor: (name) => `Waiting for ${name}…`,
        escapeToCancel: ' Escape to cancel.',
        twilightPool: 'Twilight',
        twilight: 'twilight',
        twilights: 'twilight',
    },
    toast: {
        actionRequired: 'ACTION REQUIRED',
        burdenBid: 'BURDEN BID',
        burdenBidBody:
            'Bid burdens to decide who chooses the first player.',
        chooseFirst: 'CHOOSE FIRST PLAYER',
        chooseFirstWin: 'You won the bid! Choose your side.',
        chooseFirstWait: 'Waiting for first player choice…',
        mulligan: 'MULLIGAN',
        mulliganBody:
            'Look at your hand of 8 cards. Keep it or take a mulligan?',
        mulliganWait: 'Waiting for mulligan decision…',
        muster: 'REGROUP (MUSTER)',
        forcedChoice: 'FORCED CHOICE',
        chooseOption: 'Choose an option.',
        exert: 'EXERT',
        discard: 'DISCARD',
        siteEffect: 'SITE EFFECT',
        siteEffectLeft: 'LEFT SITE EFFECT',
        siteEffectOptional: 'You may use this site’s optional effect.',
        siteFollowerExert: 'You may exert a companion after the transfer.',
        startOfPhase: 'START OF PHASE',
        response: 'RESPONSE',
        startOfSkirmish: 'START OF SKIRMISH',
        eachTime: 'EACH TIME',
        whenYouPlay: 'WHEN YOU PLAY',
        optionalEffect: 'OPTIONAL EFFECT',
        reveal: 'REVEAL',
        threats: 'THREATS',
        siteWounds: 'SITE WOUNDS',
        yourTurnToRespond: 'YOUR TURN TO RESPOND',
        yourTurnToAct: 'ACTION TURN',
        respondOrPass: 'Your turn to respond or pass.',
        actOrPass: 'Your turn to act or pass.',
        siteChoice: 'CHOOSE SITE',
        siteChoiceN: (n) => `CHOOSE SITE ${n}`,
        shadowRefill: 'SHADOW HAND REFILL',
        fpRefill: 'FREE PEOPLES HAND REFILL',
        assignment: 'ASSIGNMENT',
        stack: 'STACK',
        replaceSite: 'REPLACE A SITE',
        playOnSite: 'PLAY ON A SITE',
        stackOnSite: 'STACK ON A SITE',
        playFromStack: 'PLAY FROM STACK',
        sanctuary: 'SANCTUARY',
        chooseTarget: 'CHOOSE TARGET',
        pendingCard: 'PENDING CARD',
        playFirstFp: 'Play First (Free Peoples)',
        playSecondShadow: 'Play Second (Shadow)',
        keepHand: 'Keep my hand',
        mulliganDraw: 'Mulligan (8 new cards)',
        validateDrawn: (n) =>
            `Confirm (${n} drawn)`,
        ignoreMuster: 'Ignore Muster',
        endStartOfPhase: 'End start of phase ➔',
        validate: 'Confirm',
        proceedToSkirmishes: 'Proceed to skirmishes',
        validateWithoutDiscard: 'Confirm without discarding',
        validateReveal: 'Confirm reveal',
        preventTwilight: (n) => `Prevent (−${n} twilight)`,
        preventBurdens: (n) =>
            `Prevent (+${n} burden${n > 1 ? 's' : ''})`,
        preventDiscardUnbound: 'Prevent (discard an unbound companion)',
        preventExertCompanion: 'Prevent (exert this companion)',
        preventWoundBearer: 'Prevent (wound the Ring-bearer)',
        passPlayNothing: 'PASS (Play nothing)',
        leaveShadowAssign: 'Let Shadow assign minions…',
        assignRemaining: 'Assign your remaining minions, or confirm.',
        discardPossessionOrCondition: 'Discard a possession or condition.',
        fpChooseDiscard:
            'Free Peoples choose a possession or condition to discard…',
        shadowChooseCondition: 'Shadow chooses a condition to discard…',
        discardConditionInPlay: 'Discard a condition in play.',
        gameInProgress: 'Game in progress',
    },
    bidding: {
        bidRecorded: (points) => `Bid recorded: ${points}`,
        waitingSuffix: (name) => `. Waiting for ${name}…`,
        placeBid: (points) => `Bid ${points}`,
    },
    pointsFardeau: (n) => (n === 1 ? `${n} burden` : `${n} burdens`),
    rail: {
        drawDeck: 'Draw deck',
        drawDeckTitle: 'Draw deck — face down, not browsable',
        discard: 'Discard',
        cemetery: 'Dead pile',
        removed: (n) => `Removed from game · ${n}`,
        threatOne: '1 threat',
        threats: (n) => `${n} threats`,
        threatLimit: (n) => `limit ${n} companions`,
        advPrefix: 'Opp. ',
        empty: 'empty',
        cardsCount: (n) => `${n} cards`,
        initiative: 'Initiative',
        initiativeTitle:
            'Free Peoples have initiative with at least 4 cards in hand; otherwise Shadow does.',
        journal: 'Log',
        chat: 'Chat',
        filterFeed: 'Filter log',
        chatMessages: 'Chat messages',
        gameJournal: 'Game log',
        noChat: 'No chat messages',
        writePlaceholder: 'Write…',
        chatUnavailable: 'Chat unavailable',
        chatMessageAria: 'Chat message',
        send: 'Send',
        playerFallback: (id) => `Player ${id}`,
    },
    overlay: {
        emptyPile: 'This pile is empty.',
        noCards: 'No cards',
        cardsOrder: (n) =>
            n === 1
                ? '1 card · order: top of pile first'
                : `${n} cards · order: top of pile first`,
        cardsPick: (n) =>
            `${n} card${n > 1 ? 's' : ''} · choose a playable card`,
        copies: (n) => `${n} copies`,
        myDiscard: 'My discard',
        myCemetery: 'My dead pile',
        opponentDiscard: 'Opponent discard',
        opponentCemetery: 'Opponent dead pile',
        myRemoved: 'My removed cards',
        opponentRemoved: 'Opponent removed cards',
        deckOrDiscard: 'Draw deck or discard',
        deck: 'Draw deck',
        yourDiscard: 'Your discard',
        revealedCards: 'Revealed cards',
        opponentHandRevealed: 'Opponent hand revealed',
    },
    gameEnd: {
        youWin: 'You win the game',
        namedWins: (name) => `${name} wins the game`,
        newGame: 'New game',
        watchBoard: 'View the board',
        siteNine: (name, female) =>
            female
                ? `${name}, with her companions’ help, destroyed Sauron’s Ring.`
                : `${name}, with his companions’ help, destroyed Sauron’s Ring.`,
        corruption: (name, female) =>
            female
                ? `${name} was corrupted by the will of the Ring.`
                : `${name} was corrupted by the will of the Ring.`,
        ringBearerKilled: (name) => `${name} succumbed to wounds.`,
    },
};

const de: ChromeMessages = {
    phases: {
        setup: 'Vorbereitung',
        fellowship: 'Gemeinschaftsphase',
        shadow: 'Schattenphase',
        maneuver: 'Manöverphase',
        archery: 'Fernkampfphase',
        assignment: 'Zuweisungsphase',
        skirmish: 'Kampfphase',
        regroup: 'Sammelphase',
        short: {
            setup: 'Vorbereitung',
            fellowship: 'Gemeinschaft',
            shadow: 'Schatten',
            maneuver: 'Manöver',
            archery: 'Fernkampf',
            assignment: 'Zuweisung',
            skirmish: 'Kampf',
            regroup: 'Sammeln',
        },
    },
    banner: {
        phase: 'Phase:',
        activePlayer: 'Aktiver Spieler:',
        endFellowship: 'Gemeinschaft beenden ➔',
        endShadow: 'Schatten beenden ➔',
        validateShadowHand: 'Hand bestätigen (Schatten) 🃏',
        moveToSite: 'Zum nächsten Ort 🏕️',
        endTurn: 'Zug beenden 🏁',
        validateHandEndTurn: 'Hand bestätigen & Zug beenden 🏁',
    },
    common: {
        pass: 'Passen',
        cancel: 'Abbrechen',
        confirm: 'Bestätigen',
        activateEffect: 'Effekt aktivieren',
        close: 'Schließen',
        you: 'Du',
        freePeoples: 'Freie Völker',
        shadow: 'Schatten',
        waitingFor: (name) => `Warte auf ${name}…`,
        escapeToCancel: ' Escape zum Abbrechen.',
        twilightPool: 'Einfluss',
        twilight: 'Einfluss',
        twilights: 'Einfluss',
    },
    toast: {
        actionRequired: 'AKTION ERFORDERLICH',
        burdenBid: 'LASTMARKEN-GEBOT',
        burdenBidBody:
            'Bietet Lastmarken, um zu entscheiden, wer den ersten Spieler wählt.',
        chooseFirst: 'ERSTEN SPIELER WÄHLEN',
        chooseFirstWin: 'Du hast das Gebot gewonnen! Wähle deine Seite.',
        chooseFirstWait: 'Warte auf die Wahl des ersten Spielers…',
        mulligan: 'MULLIGAN',
        mulliganBody:
            'Sieh dir deine 8 Karten an. Behalten oder Mulligan?',
        mulliganWait: 'Warte auf die Mulligan-Entscheidung…',
        muster: 'SAMMELN (MUSTER)',
        forcedChoice: 'ERZWUNGENE WAHL',
        chooseOption: 'Wähle eine Option.',
        exert: 'ERSCHÖPFEN',
        discard: 'ABLEGEN',
        siteEffect: 'ORTSEFFEKT',
        siteEffectLeft: 'VERLASSENER ORT',
        siteEffectOptional: 'Du darfst den optionalen Effekt dieses Orts nutzen.',
        siteFollowerExert:
            'Du darfst nach dem Transfer einen Gefährten erschöpfen.',
        startOfPhase: 'PHASENBEGINN',
        response: 'REAKTION',
        startOfSkirmish: 'KAMPFBEGINN',
        eachTime: 'JEDES MAL',
        whenYouPlay: 'WENN DU SPIELST',
        optionalEffect: 'OPTIONALER EFFEKT',
        reveal: 'AUFDECKEN',
        threats: 'BEDROHUNGEN',
        siteWounds: 'ORTSWUNDEN',
        yourTurnToRespond: 'DU BIST AM ZUG ZU REAGIEREN',
        yourTurnToAct: 'AKTIONSZUG',
        respondOrPass: 'Du kannst reagieren oder passen.',
        actOrPass: 'Du kannst handeln oder passen.',
        siteChoice: 'ORT WÄHLEN',
        siteChoiceN: (n) => `ORT ${n} WÄHLEN`,
        shadowRefill: 'SCHATTEN-HAND AUFFÜLLEN',
        fpRefill: 'FREIE-VÖLKER-HAND AUFFÜLLEN',
        assignment: 'ZUWEISUNG',
        stack: 'STAPELN',
        replaceSite: 'ORT ERSETZEN',
        playOnSite: 'AUF EINEN ORT SPIELEN',
        stackOnSite: 'AUF EINEN ORT STAPELN',
        playFromStack: 'VOM STAPEL SPIELEN',
        sanctuary: 'ZUFLUCHT',
        chooseTarget: 'ZIEL WÄHLEN',
        pendingCard: 'AUSSTEHENDE KARTE',
        playFirstFp: 'Zuerst spielen (Freie Völker)',
        playSecondShadow: 'Zweitens spielen (Schatten)',
        keepHand: 'Hand behalten',
        mulliganDraw: 'Mulligan (8 neue)',
        validateDrawn: (n) => `Bestätigen (${n} gezogen)`,
        ignoreMuster: 'Muster ignorieren',
        endStartOfPhase: 'Phasenbeginn beenden ➔',
        validate: 'Bestätigen',
        proceedToSkirmishes: 'Zu den Kämpfen',
        validateWithoutDiscard: 'Ohne Ablegen bestätigen',
        validateReveal: 'Aufdecken bestätigen',
        preventTwilight: (n) =>
            `Verhindern (−${n} Einfluss)`,
        preventBurdens: (n) =>
            `Verhindern (+${n} Lastmarke${n > 1 ? 'n' : ''})`,
        preventDiscardUnbound:
            'Verhindern (ungebundenen Gefährten ablegen)',
        preventExertCompanion: 'Verhindern (diesen Gefährten erschöpfen)',
        preventWoundBearer: 'Verhindern (Ringträger verwunden)',
        passPlayNothing: 'PASSEN (Nichts spielen)',
        leaveShadowAssign: 'Lass den Schatten Diener zuweisen…',
        assignRemaining: 'Weise restliche Diener zu oder bestätige.',
        discardPossessionOrCondition: 'Lege einen Besitz oder Zustand ab.',
        fpChooseDiscard:
            'Die Freien Völker wählen einen Besitz oder Zustand zum Ablegen…',
        shadowChooseCondition: 'Der Schatten wählt einen Zustand zum Ablegen…',
        discardConditionInPlay: 'Lege einen Zustand im Spiel ab.',
        gameInProgress: 'Spiel läuft',
    },
    bidding: {
        bidRecorded: (points) => `Gebot gespeichert: ${points}`,
        waitingSuffix: (name) => `. Warte auf ${name}…`,
        placeBid: (points) => `Bieten ${points}`,
    },
    pointsFardeau: (n) =>
        n === 1 ? `${n} Lastmarke` : `${n} Lastmarken`,
    rail: {
        drawDeck: 'Nachziehstapel',
        drawDeckTitle: 'Nachziehstapel — verdeckt, nicht einsehbar',
        discard: 'Ablagestapel',
        cemetery: 'Totenschrein',
        removed: (n) => `Aus dem Spiel · ${n}`,
        threatOne: '1 Bedrohung',
        threats: (n) => `${n} Bedrohungen`,
        threatLimit: (n) => `Limit ${n} Gefährten`,
        advPrefix: 'Geg. ',
        empty: 'leer',
        cardsCount: (n) => `${n} Karten`,
        initiative: 'Initiative',
        initiativeTitle:
            'Freie Völker haben die Initiative mit mindestens 4 Handkarten; sonst der Schatten.',
        journal: 'Protokoll',
        chat: 'Chat',
        filterFeed: 'Protokoll filtern',
        chatMessages: 'Chatnachrichten',
        gameJournal: 'Spielprotokoll',
        noChat: 'Keine Chatnachrichten',
        writePlaceholder: 'Schreiben…',
        chatUnavailable: 'Chat nicht verfügbar',
        chatMessageAria: 'Chatnachricht',
        send: 'Senden',
        playerFallback: (id) => `Spieler ${id}`,
    },
    overlay: {
        emptyPile: 'Dieser Stapel ist leer.',
        noCards: 'Keine Karten',
        cardsOrder: (n) =>
            n === 1
                ? '1 Karte · Reihenfolge: oberste zuerst'
                : `${n} Karten · Reihenfolge: oberste zuerst`,
        cardsPick: (n) =>
            `${n} Karte${n > 1 ? 'n' : ''} · wähle eine spielbare Karte`,
        copies: (n) => `${n} Exemplare`,
        myDiscard: 'Mein Ablagestapel',
        myCemetery: 'Mein Totenschrein',
        opponentDiscard: 'Gegnerischer Ablagestapel',
        opponentCemetery: 'Gegnerischer Totenschrein',
        myRemoved: 'Meine entfernten Karten',
        opponentRemoved: 'Gegnerische entfernte Karten',
        deckOrDiscard: 'Nachzieh- oder Ablagestapel',
        deck: 'Nachziehstapel',
        yourDiscard: 'Dein Ablagestapel',
        revealedCards: 'Aufgedeckte Karten',
        opponentHandRevealed: 'Gegnerische Hand aufgedeckt',
    },
    gameEnd: {
        youWin: 'Du gewinnst das Spiel',
        namedWins: (name) => `${name} gewinnt das Spiel`,
        newGame: 'Neues Spiel',
        watchBoard: 'Spielfeld ansehen',
        siteNine: (name, female) =>
            female
                ? `${name} hat mit Hilfe ihrer Gefährten Saurons Ring zerstört.`
                : `${name} hat mit Hilfe seiner Gefährten Saurons Ring zerstört.`,
        corruption: (name, female) =>
            female
                ? `${name} wurde vom Willen des Rings verdorben.`
                : `${name} wurde vom Willen des Rings verdorben.`,
        ringBearerKilled: (name) =>
            `${name} erlag den Wunden.`,
    },
};

const it: ChromeMessages = {
    phases: {
        setup: 'Preparazione',
        fellowship: 'Fase di Compagnia',
        shadow: 'Fase Ombra',
        maneuver: 'Fase di Manovra',
        archery: 'Fase di Tiro',
        assignment: 'Fase di Assegnazione',
        skirmish: 'Fase di Schermaglia',
        regroup: 'Fase di Raduno',
        short: {
            setup: 'Preparazione',
            fellowship: 'Compagnia',
            shadow: 'Ombra',
            maneuver: 'Manovra',
            archery: 'Tiro',
            assignment: 'Assegnazione',
            skirmish: 'Schermaglia',
            regroup: 'Raduno',
        },
    },
    banner: {
        phase: 'Fase:',
        activePlayer: 'Giocatore attivo:',
        endFellowship: 'Fine Compagnia ➔',
        endShadow: 'Fine Ombra ➔',
        validateShadowHand: 'Conferma mano (Ombra) 🃏',
        moveToSite: 'Avanza al sito 🏕️',
        endTurn: 'Termina il turno 🏁',
        validateHandEndTurn: 'Conferma mano e fine turno 🏁',
    },
    common: {
        pass: 'Passa',
        cancel: 'Annulla',
        confirm: 'Conferma',
        activateEffect: 'Attiva l’effetto',
        close: 'Chiudi',
        you: 'Tu',
        freePeoples: 'Popoli Liberi',
        shadow: 'Ombra',
        waitingFor: (name) => `In attesa di ${name}…`,
        escapeToCancel: ' Esc per annullare.',
        twilightPool: 'Crepuscolo',
        twilight: 'crepuscolo',
        twilights: 'crepuscolo',
    },
    toast: {
        actionRequired: 'AZIONE RICHIESTA',
        burdenBid: 'ASTA DEI FARDELLI',
        burdenBidBody:
            'Punta fardelli per decidere chi sceglie il primo giocatore.',
        chooseFirst: 'SCELTA DEL PRIMO GIOCATORE',
        chooseFirstWin: 'Hai vinto l’asta! Scegli il tuo schieramento.',
        chooseFirstWait: 'In attesa della scelta del primo giocatore…',
        mulligan: 'MULLIGAN',
        mulliganBody:
            'Guarda la tua mano di 8 carte. Tenerla o fare mulligan?',
        mulliganWait: 'In attesa della decisione sul mulligan…',
        muster: 'RADUNO (MUSTER)',
        forcedChoice: 'SCELTA OBBLIGATA',
        chooseOption: 'Scegli un’opzione.',
        exert: 'SFINITE',
        discard: 'SCARTA',
        siteEffect: 'EFFETTO DEL SITO',
        siteEffectLeft: 'EFFETTO DEL SITO LASCIATO',
        siteEffectOptional: 'Puoi usare l’effetto opzionale di questo sito.',
        siteFollowerExert:
            'Puoi sfinire un compagno dopo il trasferimento.',
        startOfPhase: 'INIZIO FASE',
        response: 'RISPOSTA',
        startOfSkirmish: 'INIZIO SCHERMAGLIA',
        eachTime: 'OGNI VOLTA',
        whenYouPlay: 'QUANDO GIOCHI',
        optionalEffect: 'EFFETTO OPZIONALE',
        reveal: 'RIVELAZIONE',
        threats: 'MINACCE',
        siteWounds: 'FERITE DEL SITO',
        yourTurnToRespond: 'TOCCA A TE RISPONDERE',
        yourTurnToAct: 'TURNO DI AZIONE',
        respondOrPass: 'Tocca a te rispondere o passare.',
        actOrPass: 'Tocca a te agire o passare.',
        siteChoice: 'SCELTA DEL SITO',
        siteChoiceN: (n) => `SCELTA DEL SITO ${n}`,
        shadowRefill: 'RIFORNIMENTO MANO OMBRA',
        fpRefill: 'RIFORNIMENTO MANO POPOLI LIBERI',
        assignment: 'ASSEGNAZIONE',
        stack: 'IMPILEA',
        replaceSite: 'SOSTITUISCI UN SITO',
        playOnSite: 'GIOCA SU UN SITO',
        stackOnSite: 'IMPILEA SU UN SITO',
        playFromStack: 'GIOCA DALLA PILA',
        sanctuary: 'RIFUGIO',
        chooseTarget: 'SCELTA DEL BERSAGLIO',
        pendingCard: 'CARTA IN CORSO',
        playFirstFp: 'Gioca per primo (Popoli Liberi)',
        playSecondShadow: 'Gioca per secondo (Ombra)',
        keepHand: 'Tieni la mano',
        mulliganDraw: 'Mulligan (8 nuove)',
        validateDrawn: (n) => `Conferma (${n} pescate)`,
        ignoreMuster: 'Ignora Muster',
        endStartOfPhase: 'Termina inizio fase ➔',
        validate: 'Conferma',
        proceedToSkirmishes: 'Passa alle schermaglie',
        validateWithoutDiscard: 'Conferma senza scartare',
        validateReveal: 'Conferma rivelazione',
        preventTwilight: (n) =>
            `Impedisci (−${n} crepuscolo)`,
        preventBurdens: (n) =>
            `Impedisci (+${n} fardell${n > 1 ? 'i' : 'o'})`,
        preventDiscardUnbound:
            'Impedisci (scarta un compagno non vincolato)',
        preventExertCompanion: 'Impedisci (sfini questo compagno)',
        preventWoundBearer: 'Impedisci (ferisci il Portatore)',
        passPlayNothing: 'PASSA (Non giocare nulla)',
        leaveShadowAssign: 'Lascia che l’Ombra assegni i servitori…',
        assignRemaining: 'Assegna i servitori restanti, o conferma.',
        discardPossessionOrCondition: 'Scarta un possesso o una condizione.',
        fpChooseDiscard:
            'I Popoli Liberi scelgono un possesso o una condizione da scartare…',
        shadowChooseCondition: 'L’Ombra sceglie una condizione da scartare…',
        discardConditionInPlay: 'Scarta una condizione in gioco.',
        gameInProgress: 'Partita in corso',
    },
    bidding: {
        bidRecorded: (points) => `Punta registrata: ${points}`,
        waitingSuffix: (name) => `. In attesa di ${name}…`,
        placeBid: (points) => `Punta ${points}`,
    },
    pointsFardeau: (n) =>
        n === 1 ? `${n} fardello` : `${n} fardelli`,
    rail: {
        drawDeck: 'Mazzo',
        drawDeckTitle: 'Mazzo — coperto, non consultabile',
        discard: 'Scarti',
        cemetery: 'Pila dei morti',
        removed: (n) => `Rimosse dal gioco · ${n}`,
        threatOne: '1 minaccia',
        threats: (n) => `${n} minacce`,
        threatLimit: (n) => `limite ${n} compagni`,
        advPrefix: 'Avv. ',
        empty: 'vuoto',
        cardsCount: (n) => `${n} carte`,
        initiative: 'Iniziativa',
        initiativeTitle:
            'I Popoli Liberi hanno l’iniziativa con almeno 4 carte in mano; altrimenti l’Ombra.',
        journal: 'Diario',
        chat: 'Chat',
        filterFeed: 'Filtra il diario',
        chatMessages: 'Messaggi di chat',
        gameJournal: 'Diario di partita',
        noChat: 'Nessun messaggio di chat',
        writePlaceholder: 'Scrivi…',
        chatUnavailable: 'Chat non disponibile',
        chatMessageAria: 'Messaggio di chat',
        send: 'Invia',
        playerFallback: (id) => `Giocatore ${id}`,
    },
    overlay: {
        emptyPile: 'Questa pila è vuota.',
        noCards: 'Nessuna carta',
        cardsOrder: (n) =>
            n === 1
                ? '1 carta · ordine: cima della pila per prima'
                : `${n} carte · ordine: cima della pila per prima`,
        cardsPick: (n) =>
            `${n} cart${n > 1 ? 'e' : 'a'} · scegli una carta giocabile`,
        copies: (n) => `${n} esemplari`,
        myDiscard: 'I miei scarti',
        myCemetery: 'La mia pila dei morti',
        opponentDiscard: 'Scarti avversari',
        opponentCemetery: 'Pila dei morti avversaria',
        myRemoved: 'Le mie carte rimosse',
        opponentRemoved: 'Carte avversarie rimosse',
        deckOrDiscard: 'Mazzo o scarti',
        deck: 'Mazzo',
        yourDiscard: 'I tuoi scarti',
        revealedCards: 'Carte rivelate',
        opponentHandRevealed: 'Mano avversaria rivelata',
    },
    gameEnd: {
        youWin: 'Hai vinto la partita',
        namedWins: (name) => `${name} vince la partita`,
        newGame: 'Nuova partita',
        watchBoard: 'Guarda il tavolo',
        siteNine: (name, female) =>
            female
                ? `${name}, con l’aiuto dei suoi compagni, ha distrutto l’Anello di Sauron.`
                : `${name}, con l’aiuto dei suoi compagni, ha distrutto l’Anello di Sauron.`,
        corruption: (name, female) =>
            female
                ? `${name} è stata corrotta dalla volontà dell’Anello.`
                : `${name} è stato corrotto dalla volontà dell’Anello.`,
        ringBearerKilled: (name) =>
            `${name} è soccombuto alle ferite.`,
    },
};

const es: ChromeMessages = {
    phases: {
        setup: 'Preparación',
        fellowship: 'Fase de Comunidad',
        shadow: 'Fase de Sombra',
        maneuver: 'Fase de Maniobra',
        archery: 'Fase de Arquería',
        assignment: 'Fase de Asignación',
        skirmish: 'Fase de Escaramuza',
        regroup: 'Fase de Reagrupación',
        short: {
            setup: 'Preparación',
            fellowship: 'Comunidad',
            shadow: 'Sombra',
            maneuver: 'Maniobra',
            archery: 'Arquería',
            assignment: 'Asignación',
            skirmish: 'Escaramuza',
            regroup: 'Reagrupación',
        },
    },
    banner: {
        phase: 'Fase:',
        activePlayer: 'Jugador activo:',
        endFellowship: 'Fin de Comunidad ➔',
        endShadow: 'Fin de Sombra ➔',
        validateShadowHand: 'Validar mano (Sombra) 🃏',
        moveToSite: 'Avanzar al sitio 🏕️',
        endTurn: 'Terminar el turno 🏁',
        validateHandEndTurn: 'Validar mano y fin de turno 🏁',
    },
    common: {
        pass: 'Pasar',
        cancel: 'Cancelar',
        confirm: 'Validar',
        activateEffect: 'Activar el efecto',
        close: 'Cerrar',
        you: 'Tú',
        freePeoples: 'Pueblos Libres',
        shadow: 'Sombra',
        waitingFor: (name) => `Esperando a ${name}…`,
        escapeToCancel: ' Esc para cancelar.',
        twilightPool: 'Crepúsculo',
        twilight: 'crepúsculo',
        twilights: 'crepúsculo',
    },
    toast: {
        actionRequired: 'ACCIÓN REQUERIDA',
        burdenBid: 'PUJA DE CARGAS',
        burdenBidBody:
            'Puja cargas para decidir quién elige al primer jugador.',
        chooseFirst: 'ELEGIR PRIMER JUGADOR',
        chooseFirstWin: '¡Ganaste la puja! Elige tu bando.',
        chooseFirstWait: 'Esperando la elección del primer jugador…',
        mulligan: 'MULLIGAN',
        mulliganBody:
            'Mira tu mano de 8 cartas. ¿La conservas o haces mulligan?',
        mulliganWait: 'Esperando la decisión de mulligan…',
        muster: 'REAGRUPACIÓN (MUSTER)',
        forcedChoice: 'ELECCIÓN FORZADA',
        chooseOption: 'Elige una opción.',
        exert: 'AGOTAR',
        discard: 'DESCARTAR',
        siteEffect: 'EFECTO DEL SITIO',
        siteEffectLeft: 'EFECTO DEL SITIO ABANDONADO',
        siteEffectOptional: 'Puedes usar el efecto opcional de este sitio.',
        siteFollowerExert:
            'Puedes agotar un compañero tras la transferencia.',
        startOfPhase: 'INICIO DE FASE',
        response: 'RESPUESTA',
        startOfSkirmish: 'INICIO DE ESCARAMUZA',
        eachTime: 'CADA VEZ',
        whenYouPlay: 'CUANDO JUEGAS',
        optionalEffect: 'EFECTO OPCIONAL',
        reveal: 'REVELACIÓN',
        threats: 'AMENAZAS',
        siteWounds: 'HERIDAS DEL SITIO',
        yourTurnToRespond: 'TE TOCA RESPONDER',
        yourTurnToAct: 'TURNO DE ACCIÓN',
        respondOrPass: 'Te toca responder o pasar.',
        actOrPass: 'Te toca actuar o pasar.',
        siteChoice: 'ELEGIR SITIO',
        siteChoiceN: (n) => `ELEGIR SITIO ${n}`,
        shadowRefill: 'RECOMPOSICIÓN DE MANO SOMBRA',
        fpRefill: 'RECOMPOSICIÓN DE MANO PUEBLOS LIBRES',
        assignment: 'ASIGNACIÓN',
        stack: 'APILAR',
        replaceSite: 'REEMPLAZAR UN SITIO',
        playOnSite: 'JUGAR SOBRE UN SITIO',
        stackOnSite: 'APILAR SOBRE UN SITIO',
        playFromStack: 'JUGAR DESDE LA PILA',
        sanctuary: 'SANTUARIO',
        chooseTarget: 'ELEGIR OBJETIVO',
        pendingCard: 'CARTA EN CURSO',
        playFirstFp: 'Jugar primero (Pueblos Libres)',
        playSecondShadow: 'Jugar segundo (Sombra)',
        keepHand: 'Conservar mi mano',
        mulliganDraw: 'Mulligan (8 nuevas)',
        validateDrawn: (n) => `Validar (${n} robada${n > 1 ? 's' : ''})`,
        ignoreMuster: 'Ignorar Muster',
        endStartOfPhase: 'Terminar inicio de fase ➔',
        validate: 'Validar',
        proceedToSkirmishes: 'Pasar a las escaramuzas',
        validateWithoutDiscard: 'Validar sin descartar',
        validateReveal: 'Validar revelación',
        preventTwilight: (n) =>
            `Impedir (−${n} crepúsculo)`,
        preventBurdens: (n) =>
            `Impedir (+${n} carga${n > 1 ? 's' : ''})`,
        preventDiscardUnbound:
            'Impedir (descartar un compañero no vinculado)',
        preventExertCompanion: 'Impedir (agotar este compañero)',
        preventWoundBearer: 'Impedir (herir al Portador)',
        passPlayNothing: 'PASAR (No jugar nada)',
        leaveShadowAssign: 'Deja que la Sombra asigne esbirros…',
        assignRemaining: 'Asigna tus esbirros restantes, o valida.',
        discardPossessionOrCondition: 'Descarta una posesión o condición.',
        fpChooseDiscard:
            'Los Pueblos Libres eligen una posesión o condición para descartar…',
        shadowChooseCondition: 'La Sombra elige una condición para descartar…',
        discardConditionInPlay: 'Descarta una condición en juego.',
        gameInProgress: 'Partida en curso',
    },
    bidding: {
        bidRecorded: (points) => `Puja registrada: ${points}`,
        waitingSuffix: (name) => `. Esperando a ${name}…`,
        placeBid: (points) => `Pujar ${points}`,
    },
    pointsFardeau: (n) => (n === 1 ? `${n} carga` : `${n} cargas`),
    rail: {
        drawDeck: 'Mazo',
        drawDeckTitle: 'Mazo — boca abajo, no consultable',
        discard: 'Descarte',
        cemetery: 'Pila de muertos',
        removed: (n) => `Retiradas del juego · ${n}`,
        threatOne: '1 amenaza',
        threats: (n) => `${n} amenazas`,
        threatLimit: (n) => `límite ${n} compañeros`,
        advPrefix: 'Riv. ',
        empty: 'vacío',
        cardsCount: (n) => `${n} cartas`,
        initiative: 'Iniciativa',
        initiativeTitle:
            'Los Pueblos Libres tienen la iniciativa con al menos 4 cartas en mano; si no, la Sombra.',
        journal: 'Diario',
        chat: 'Chat',
        filterFeed: 'Filtrar el diario',
        chatMessages: 'Mensajes de chat',
        gameJournal: 'Diario de la partida',
        noChat: 'Ningún mensaje de chat',
        writePlaceholder: 'Escribir…',
        chatUnavailable: 'Chat no disponible',
        chatMessageAria: 'Mensaje de chat',
        send: 'Enviar',
        playerFallback: (id) => `Jugador ${id}`,
    },
    overlay: {
        emptyPile: 'Esta pila está vacía.',
        noCards: 'Ninguna carta',
        cardsOrder: (n) =>
            n === 1
                ? '1 carta · orden: la cima primero'
                : `${n} cartas · orden: la cima primero`,
        cardsPick: (n) =>
            `${n} carta${n > 1 ? 's' : ''} · elige una carta jugable`,
        copies: (n) => `${n} ejemplares`,
        myDiscard: 'Mi descarte',
        myCemetery: 'Mi pila de muertos',
        opponentDiscard: 'Descarte rival',
        opponentCemetery: 'Pila de muertos rival',
        myRemoved: 'Mis cartas retiradas',
        opponentRemoved: 'Cartas rivales retiradas',
        deckOrDiscard: 'Mazo o descarte',
        deck: 'Mazo',
        yourDiscard: 'Tu descarte',
        revealedCards: 'Cartas reveladas',
        opponentHandRevealed: 'Mano rival revelada',
    },
    gameEnd: {
        youWin: 'Ganas la partida',
        namedWins: (name) => `${name} gana la partida`,
        newGame: 'Nueva partida',
        watchBoard: 'Ver el tablero',
        siteNine: (name, female) =>
            female
                ? `${name}, con la ayuda de sus compañeros, destruyó el Anillo de Sauron.`
                : `${name}, con la ayuda de sus compañeros, destruyó el Anillo de Sauron.`,
        corruption: (name, female) =>
            female
                ? `${name} fue corrompida por la voluntad del Anillo.`
                : `${name} fue corrompido por la voluntad del Anillo.`,
        ringBearerKilled: (name) =>
            `${name} sucumbió a sus heridas.`,
    },
};

export const CHROME_MESSAGES: Record<SupportedLanguage, ChromeMessages> = {
    fr,
    en,
    de,
    it,
    es,
};

export function shortPhaseLabel(
    chrome: ChromeMessages,
    phaseKey: string
): string {
    const key = phaseKey.toLowerCase() as keyof ChromeMessages['phases']['short'];
    return chrome.phases.short[key] || phaseKey;
}

export function longPhaseLabel(
    chrome: ChromeMessages,
    phaseKey: string
): string {
    const key = phaseKey.toLowerCase() as keyof Omit<
        ChromeMessages['phases'],
        'short'
    >;
    const value = chrome.phases[key];
    return typeof value === 'string' ? value : phaseKey;
}
