import type { SupportedLanguage } from '../languages';

/** Consignes locales (bandeau) — par joueur, pas partagées dans G. */
export type InstructionMessages = {
    bidRecorded: (pointsLabel: string) => string;
    bidChoose: string;
    chooseSideWin: string;
    chooseSideWait: (name: string) => string;
    mulliganRecorded: string;
    mulliganDecide: string;
    musterDoneWaiting: (name: string) => string;
    musterProgress: (discarded: number, allowed: number) => string;
    forcedChoiceExert: (n: number) => string;
    forcedChoiceHand: (n: number) => string;
    forcedChoicePick: string;
    forcedChoiceWait: (name: string) => string;
    startOfPhaseAct: string;
    startOfPhaseValidate: string;
    sanctuaryHealYou: (n: number) => string;
    sanctuaryHealWait: string;
    threatWoundsYou: (n: number) => string;
    threatWoundsWait: string;
    siteWoundsYou: (n: number) => string;
    siteWoundsWait: (name: string) => string;
    clickDiscardHand: string;
    clickDesignate: string;
    opponentDesignating: (name: string) => string;
    siteMoveClick: string;
    siteMoveYou: string;
    siteMoveWait: (name: string) => string;
    sitePhaseYou: string;
    sitePhaseWait: string;
    optionalEffectYou: string;
    optionalEffectWait: (name: string) => string;
    preventAssignWait: (name: string) => string;
    responseWait: (name: string) => string;
    actionWait: (name: string) => string;
    placeSite1: string;
    placeNextSite: string;
    waitingSite: string;
    fellowshipYou: string;
    fellowshipWait: string;
    shadowYou: string;
    shadowWait: string;
    archeryFpYou: (n: number) => string;
    archeryFpWait: (n: number) => string;
    archeryShadowYou: (n: number) => string;
    archeryShadowWait: (n: number) => string;
    archeryOngoing: string;
    assignFpYou: string;
    assignFpWait: string;
    assignShadowYou: string;
    assignShadowWait: string;
    assignOngoing: string;
    regroupShadowRefillYou: string;
    regroupShadowRefillWait: string;
    regroupFpRefillYou: string;
    regroupFpRefillWait: string;
    regroupDecideYou: string;
    regroupDecideWait: string;
};

const fr: InstructionMessages = {
    bidRecorded: (pointsLabel) =>
        `Votre mise (${pointsLabel}) est enregistrée.`,
    bidChoose:
        'Choisissez le nombre de points-fardeau que vous êtes prêt à miser.',
    chooseSideWin: "Vous avez remporté l'enchère ! Choisissez votre camp.",
    chooseSideWait: (name) => `${name} détermine l'ordre des joueurs…`,
    mulliganRecorded: 'Votre choix de Mulligan est enregistré.',
    mulliganDecide:
        'Décidez si vous conservez votre main de départ ou si vous remélangez.',
    musterDoneWaiting: (name) =>
        `Effet de Rassembleur validé. En attente de ${name}…`,
    musterProgress: (discarded, allowed) =>
        `Défaussées : ${discarded} / ${allowed} carte(s). Cliquez sur vos cartes ou validez.`,
    forcedChoiceExert: (n) =>
        `Choisissez ${n} compagnons à affaiblir.`,
    forcedChoiceHand: (n) =>
        `Défaussez ${n} carte(s) de votre main.`,
    forcedChoicePick: 'Choisissez une option pour le site / l’effet en cours.',
    forcedChoiceWait: (name) => `${name} doit résoudre un choix forcé…`,
    startOfPhaseAct:
        'Activez vos effets de début de phase sur vos cartes, ou validez.',
    startOfPhaseValidate: 'Plus d’action disponible. Validez pour continuer.',
    sanctuaryHealYou: (n) =>
        `Sanctuaire : soignez jusqu’à ${n} blessure(s), ou validez.`,
    sanctuaryHealWait:
        'Les Peuples Libres soignent leurs compagnons au sanctuaire...',
    threatWoundsYou: (n) =>
        `Assignez ${n} blessure(s) de menaces à vos compagnons.`,
    threatWoundsWait:
        'Les Peuples Libres assignent les blessures des menaces...',
    siteWoundsYou: (n) =>
        `Assignez ${n} blessure(s) du site à vos personnages.`,
    siteWoundsWait: (name) => `${name} assigne les blessures du site…`,
    clickDiscardHand: 'Cliquez sur les cartes à défausser.',
    clickDesignate: 'Cliquez sur une carte pour la désigner.',
    opponentDesignating: (name) => `${name} désigne une cible.`,
    siteMoveClick: 'Cliquez sur une carte pour appliquer l’effet du site.',
    siteMoveYou: 'Vous pouvez utiliser l’effet du site d’arrivée.',
    siteMoveWait: (name) => `${name} décide d’utiliser l’effet du site…`,
    sitePhaseYou: 'Vous pouvez utiliser l’effet du site (Ombre).',
    sitePhaseWait: 'L’Ombre décide d’utiliser l’effet du site…',
    optionalEffectYou:
        'Vous pouvez activer l’effet optionnel de cette carte.',
    optionalEffectWait: (name) => `${name} décide d’un effet optionnel…`,
    preventAssignWait: (name) =>
        `${name} décide s’il empêche l’affectation…`,
    responseWait: (name) => `En attente de la réponse de ${name}…`,
    actionWait: (name) => `En attente de la réaction de ${name}…`,
    placeSite1: 'Posez votre site 1 pour démarrer l’aventure.',
    placeNextSite: 'Choix du prochain site à poser.',
    waitingSite: 'En attente de la sélection du site...',
    fellowshipYou:
        'Jouez vos compagnons ou soutiens, puis terminez la phase.',
    fellowshipWait: 'Le joueur des Peuples Libres prépare sa compagnie...',
    shadowYou: 'Jouez vos séides, traqueurs et soutiens.',
    shadowWait: "Le joueur de l'Ombre prépare ses forces...",
    archeryFpYou: (n) =>
        `Assignez vos ${n} blessure(s) d'archerie restantes aux compagnons.`,
    archeryFpWait: (n) =>
        `Les Peuples Libres attribuent ${n} blessure(s) d'archerie...`,
    archeryShadowYou: (n) =>
        `Assignez vos ${n} blessure(s) d'archerie restantes aux séides.`,
    archeryShadowWait: (n) =>
        `L'Ombre attribue ${n} blessure(s) d'archerie...`,
    archeryOngoing: 'Phase d’Archerie en cours...',
    assignFpYou: 'Assignez vos compagnons aux séides de l’Ombre.',
    assignFpWait:
        'Les Peuples Libres effectuent leurs assignations de défense...',
    assignShadowYou:
        'Assignez vos séides restants aux compagnons de votre choix.',
    assignShadowWait: 'L’Ombre assigne ses séides restants...',
    assignOngoing: 'Phase d’Assignation des combats.',
    regroupShadowRefillYou:
        'Ajustez votre main (max 8 cartes) et validez.',
    regroupShadowRefillWait: "L'Ombre réorganise sa main...",
    regroupFpRefillYou:
        'Ajustez votre main à 8 cartes et terminez le tour.',
    regroupFpRefillWait:
        'Les Peuples Libres préparent leur main pour le tour suivant...',
    regroupDecideYou:
        'Choisissez de voyager vers le site suivant ou de terminer le tour.',
    regroupDecideWait:
        'Les Peuples Libres décident de la suite du voyage...',
};

const en: InstructionMessages = {
    bidRecorded: (pointsLabel) => `Your bid (${pointsLabel}) is recorded.`,
    bidChoose: 'Choose how many burdens you are willing to bid.',
    chooseSideWin: 'You won the auction! Choose your side.',
    chooseSideWait: (name) => `${name} is deciding player order…`,
    mulliganRecorded: 'Your mulligan choice is recorded.',
    mulliganDecide: 'Keep your opening hand or reshuffle and redraw.',
    musterDoneWaiting: (name) =>
        `Muster effect confirmed. Waiting for ${name}…`,
    musterProgress: (discarded, allowed) =>
        `Discarded: ${discarded} / ${allowed} card(s). Click cards or confirm.`,
    forcedChoiceExert: (n) => `Choose ${n} companion(s) to exert.`,
    forcedChoiceHand: (n) => `Discard ${n} card(s) from your hand.`,
    forcedChoicePick: 'Choose an option for the site / pending effect.',
    forcedChoiceWait: (name) => `${name} must resolve a forced choice…`,
    startOfPhaseAct: 'Activate start-of-phase effects on your cards, or confirm.',
    startOfPhaseValidate: 'No more actions. Confirm to continue.',
    sanctuaryHealYou: (n) =>
        `Sanctuary: heal up to ${n} wound(s), or confirm.`,
    sanctuaryHealWait: 'Free Peoples are healing at sanctuary…',
    threatWoundsYou: (n) =>
        `Assign ${n} threat wound(s) to your companions.`,
    threatWoundsWait: 'Free Peoples are assigning threat wounds…',
    siteWoundsYou: (n) =>
        `Assign ${n} site wound(s) to your characters.`,
    siteWoundsWait: (name) => `${name} is assigning site wounds…`,
    clickDiscardHand: 'Click the cards to discard.',
    clickDesignate: 'Click a card to designate it.',
    opponentDesignating: (name) => `${name} is choosing a target.`,
    siteMoveClick: 'Click a card to apply the site effect.',
    siteMoveYou: 'You may use the arrival site’s effect.',
    siteMoveWait: (name) => `${name} is deciding whether to use the site…`,
    sitePhaseYou: 'You may use the site effect (Shadow).',
    sitePhaseWait: 'Shadow is deciding whether to use the site…',
    optionalEffectYou: 'You may activate this card’s optional effect.',
    optionalEffectWait: (name) => `${name} is deciding an optional effect…`,
    preventAssignWait: (name) =>
        `${name} is deciding whether to prevent the assignment…`,
    responseWait: (name) => `Waiting for ${name} to respond…`,
    actionWait: (name) => `Waiting for ${name} to react…`,
    placeSite1: 'Place your site 1 to begin the adventure.',
    placeNextSite: 'Choose the next site to place.',
    waitingSite: 'Waiting for site selection…',
    fellowshipYou: 'Play companions or supports, then end the phase.',
    fellowshipWait: 'The Free Peoples player is preparing the fellowship…',
    shadowYou: 'Play minions, hunters and supports.',
    shadowWait: 'The Shadow player is preparing forces…',
    archeryFpYou: (n) =>
        `Assign your remaining ${n} archery wound(s) to companions.`,
    archeryFpWait: (n) =>
        `Free Peoples are assigning ${n} archery wound(s)…`,
    archeryShadowYou: (n) =>
        `Assign your remaining ${n} archery wound(s) to minions.`,
    archeryShadowWait: (n) =>
        `Shadow is assigning ${n} archery wound(s)…`,
    archeryOngoing: 'Archery phase in progress…',
    assignFpYou: 'Assign your companions to Shadow minions.',
    assignFpWait: 'Free Peoples are making defensive assignments…',
    assignShadowYou: 'Assign your remaining minions to companions of your choice.',
    assignShadowWait: 'Shadow is assigning remaining minions…',
    assignOngoing: 'Skirmish assignment phase.',
    regroupShadowRefillYou: 'Adjust your hand (max 8 cards) and confirm.',
    regroupShadowRefillWait: 'Shadow is reorganizing their hand…',
    regroupFpRefillYou: 'Adjust your hand to 8 cards and end the turn.',
    regroupFpRefillWait: 'Free Peoples are preparing their hand for next turn…',
    regroupDecideYou: 'Choose to move to the next site or end the turn.',
    regroupDecideWait: 'Free Peoples are deciding the next step of the journey…',
};

const de: InstructionMessages = {
    bidRecorded: (pointsLabel) => `Dein Gebot (${pointsLabel}) ist gespeichert.`,
    bidChoose: 'Wähle, wie viele Lastmarken du bieten willst.',
    chooseSideWin: 'Du hast die Auktion gewonnen! Wähle deine Seite.',
    chooseSideWait: (name) => `${name} bestimmt die Spielreihenfolge…`,
    mulliganRecorded: 'Deine Mulligan-Wahl ist gespeichert.',
    mulliganDecide: 'Behalte deine Starthand oder mische neu und ziehe.',
    musterDoneWaiting: (name) =>
        `Muster-Effekt bestätigt. Warte auf ${name}…`,
    musterProgress: (discarded, allowed) =>
        `Abgelegt: ${discarded} / ${allowed} Karte(n). Klicke Karten oder bestätige.`,
    forcedChoiceExert: (n) => `Wähle ${n} Gefährte(n) zum Anstrengen.`,
    forcedChoiceHand: (n) => `Lege ${n} Karte(n) aus deiner Hand ab.`,
    forcedChoicePick: 'Wähle eine Option für Ort / laufenden Effekt.',
    forcedChoiceWait: (name) => `${name} muss eine Zwangswahl lösen…`,
    startOfPhaseAct:
        'Aktiviere Phasenbeginn-Effekte auf deinen Karten, oder bestätige.',
    startOfPhaseValidate: 'Keine Aktion mehr. Bestätige zum Fortfahren.',
    sanctuaryHealYou: (n) =>
        `Zuflucht: Heile bis zu ${n} Wunde(n), oder bestätige.`,
    sanctuaryHealWait: 'Freie Völker heilen in der Zuflucht…',
    threatWoundsYou: (n) =>
        `Weise ${n} Bedrohungswunde(n) deinen Gefährten zu.`,
    threatWoundsWait: 'Freie Völker weisen Bedrohungswunden zu…',
    siteWoundsYou: (n) =>
        `Weise ${n} Ortswunde(n) deinen Charakteren zu.`,
    siteWoundsWait: (name) => `${name} weist Ortswunden zu…`,
    clickDiscardHand: 'Klicke die abzulegenden Karten.',
    clickDesignate: 'Klicke eine Karte, um sie zu wählen.',
    opponentDesignating: (name) => `${name} wählt ein Ziel.`,
    siteMoveClick: 'Klicke eine Karte, um den Ortseffekt anzuwenden.',
    siteMoveYou: 'Du darfst den Effekt des Ankunftsorts nutzen.',
    siteMoveWait: (name) => `${name} entscheidet über den Ortseffekt…`,
    sitePhaseYou: 'Du darfst den Ortseffekt nutzen (Schatten).',
    sitePhaseWait: 'Schatten entscheidet über den Ortseffekt…',
    optionalEffectYou: 'Du darfst den optionalen Effekt dieser Karte aktivieren.',
    optionalEffectWait: (name) => `${name} entscheidet über einen optionalen Effekt…`,
    preventAssignWait: (name) =>
        `${name} entscheidet, ob die Zuweisung verhindert wird…`,
    responseWait: (name) => `Warte auf Antwort von ${name}…`,
    actionWait: (name) => `Warte auf Reaktion von ${name}…`,
    placeSite1: 'Lege Ort 1, um das Abenteuer zu beginnen.',
    placeNextSite: 'Wähle den nächsten zu legenden Ort.',
    waitingSite: 'Warte auf Ortswahl…',
    fellowshipYou: 'Spiele Gefährten oder Unterstützung, dann beende die Phase.',
    fellowshipWait: 'Der Spieler der Freien Völker bereitet die Gemeinschaft vor…',
    shadowYou: 'Spiele Diener, Jäger und Unterstützung.',
    shadowWait: 'Der Schattenspieler bereitet seine Kräfte vor…',
    archeryFpYou: (n) =>
        `Weise deine verbleibenden ${n} Fernkampfwunde(n) Gefährten zu.`,
    archeryFpWait: (n) =>
        `Freie Völker weisen ${n} Fernkampfwunde(n) zu…`,
    archeryShadowYou: (n) =>
        `Weise deine verbleibenden ${n} Fernkampfwunde(n) Dienern zu.`,
    archeryShadowWait: (n) =>
        `Schatten weist ${n} Fernkampfwunde(n) zu…`,
    archeryOngoing: 'Fernkampfphase läuft…',
    assignFpYou: 'Weise deine Gefährten Schattendienern zu.',
    assignFpWait: 'Freie Völker machen Verteidigungszuweisungen…',
    assignShadowYou: 'Weise verbleibende Diener Gefährten deiner Wahl zu.',
    assignShadowWait: 'Schatten weist verbleibende Diener zu…',
    assignOngoing: 'Kampf-Zuweisungsphase.',
    regroupShadowRefillYou: 'Passe deine Hand an (max. 8) und bestätige.',
    regroupShadowRefillWait: 'Schatten ordnet die Hand neu…',
    regroupFpRefillYou: 'Passe deine Hand auf 8 an und beende den Zug.',
    regroupFpRefillWait:
        'Freie Völker bereiten die Hand für den nächsten Zug vor…',
    regroupDecideYou: 'Ziehe zum nächsten Ort oder beende den Zug.',
    regroupDecideWait: 'Freie Völker entscheiden über den weiteren Weg…',
};

const it: InstructionMessages = {
    bidRecorded: (pointsLabel) => `La tua puntata (${pointsLabel}) è registrata.`,
    bidChoose: 'Scegli quanti fardelli sei disposto a puntare.',
    chooseSideWin: 'Hai vinto l’asta! Scegli il tuo schieramento.',
    chooseSideWait: (name) => `${name} decide l’ordine dei giocatori…`,
    mulliganRecorded: 'La tua scelta di mulligan è registrata.',
    mulliganDecide: 'Tieni la mano iniziale o rimescola e ripesca.',
    musterDoneWaiting: (name) =>
        `Effetto Raduno confermato. In attesa di ${name}…`,
    musterProgress: (discarded, allowed) =>
        `Scartate: ${discarded} / ${allowed} carta/e. Clicca le carte o conferma.`,
    forcedChoiceExert: (n) => `Scegli ${n} compagni da affaticare.`,
    forcedChoiceHand: (n) => `Scarta ${n} carta/e dalla mano.`,
    forcedChoicePick: 'Scegli un’opzione per il sito / effetto in corso.',
    forcedChoiceWait: (name) => `${name} deve risolvere una scelta forzata…`,
    startOfPhaseAct:
        'Attiva gli effetti di inizio fase sulle tue carte, o conferma.',
    startOfPhaseValidate: 'Nessuna azione disponibile. Conferma per continuare.',
    sanctuaryHealYou: (n) =>
        `Santuario: cura fino a ${n} ferita/e, o conferma.`,
    sanctuaryHealWait: 'I Popoli Liberi curano al santuario…',
    threatWoundsYou: (n) =>
        `Assegna ${n} ferita/e da minaccia ai tuoi compagni.`,
    threatWoundsWait: 'I Popoli Liberi assegnano le ferite da minaccia…',
    siteWoundsYou: (n) =>
        `Assegna ${n} ferita/e del sito ai tuoi personaggi.`,
    siteWoundsWait: (name) => `${name} assegna le ferite del sito…`,
    clickDiscardHand: 'Clicca le carte da scartare.',
    clickDesignate: 'Clicca una carta per designarla.',
    opponentDesignating: (name) => `${name} sceglie un bersaglio.`,
    siteMoveClick: 'Clicca una carta per applicare l’effetto del sito.',
    siteMoveYou: 'Puoi usare l’effetto del sito di arrivo.',
    siteMoveWait: (name) => `${name} decide se usare l’effetto del sito…`,
    sitePhaseYou: 'Puoi usare l’effetto del sito (Ombra).',
    sitePhaseWait: 'L’Ombra decide se usare l’effetto del sito…',
    optionalEffectYou: 'Puoi attivare l’effetto opzionale di questa carta.',
    optionalEffectWait: (name) => `${name} decide un effetto opzionale…`,
    preventAssignWait: (name) =>
        `${name} decide se impedire l’assegnazione…`,
    responseWait: (name) => `In attesa della risposta di ${name}…`,
    actionWait: (name) => `In attesa della reazione di ${name}…`,
    placeSite1: 'Piazza il sito 1 per iniziare l’avventura.',
    placeNextSite: 'Scegli il prossimo sito da piazzare.',
    waitingSite: 'In attesa della selezione del sito…',
    fellowshipYou: 'Gioca compagni o supporti, poi termina la fase.',
    fellowshipWait: 'Il giocatore dei Popoli Liberi prepara la Compagnia…',
    shadowYou: 'Gioca servitori, cacciatori e supporti.',
    shadowWait: 'Il giocatore Ombra prepara le sue forze…',
    archeryFpYou: (n) =>
        `Assegna le ${n} ferita/e di tiro rimanenti ai compagni.`,
    archeryFpWait: (n) =>
        `I Popoli Liberi assegnano ${n} ferita/e di tiro…`,
    archeryShadowYou: (n) =>
        `Assegna le ${n} ferita/e di tiro rimanenti ai servitori.`,
    archeryShadowWait: (n) =>
        `L’Ombra assegna ${n} ferita/e di tiro…`,
    archeryOngoing: 'Fase di Tiro in corso…',
    assignFpYou: 'Assegna i tuoi compagni ai servitori dell’Ombra.',
    assignFpWait: 'I Popoli Liberi effettuano le assegnazioni di difesa…',
    assignShadowYou: 'Assegna i servitori restanti ai compagni che scegli.',
    assignShadowWait: 'L’Ombra assegna i servitori restanti…',
    assignOngoing: 'Fase di assegnazione dei combattimenti.',
    regroupShadowRefillYou: 'Sistema la mano (max 8 carte) e conferma.',
    regroupShadowRefillWait: 'L’Ombra riorganizza la mano…',
    regroupFpRefillYou: 'Sistema la mano a 8 carte e termina il turno.',
    regroupFpRefillWait:
        'I Popoli Liberi preparano la mano per il turno successivo…',
    regroupDecideYou: 'Scegli di avanzare al sito successivo o terminare il turno.',
    regroupDecideWait: 'I Popoli Liberi decidono il seguito del viaggio…',
};

const es: InstructionMessages = {
    bidRecorded: (pointsLabel) => `Tu puja (${pointsLabel}) está registrada.`,
    bidChoose: 'Elige cuántas cargas estás dispuesto a pujar.',
    chooseSideWin: '¡Ganaste la subasta! Elige tu bando.',
    chooseSideWait: (name) => `${name} determina el orden de jugadores…`,
    mulliganRecorded: 'Tu elección de mulligan está registrada.',
    mulliganDecide: 'Conserva tu mano inicial o baraja y vuelve a robar.',
    musterDoneWaiting: (name) =>
        `Efecto de Reclutamiento confirmado. Esperando a ${name}…`,
    musterProgress: (discarded, allowed) =>
        `Descartadas: ${discarded} / ${allowed} carta(s). Haz clic o valida.`,
    forcedChoiceExert: (n) => `Elige ${n} compañero(s) para agotar.`,
    forcedChoiceHand: (n) => `Descarta ${n} carta(s) de tu mano.`,
    forcedChoicePick: 'Elige una opción para el sitio / efecto en curso.',
    forcedChoiceWait: (name) => `${name} debe resolver una elección forzada…`,
    startOfPhaseAct:
        'Activa efectos de inicio de fase en tus cartas, o valida.',
    startOfPhaseValidate: 'No quedan acciones. Valida para continuar.',
    sanctuaryHealYou: (n) =>
        `Santuario: cura hasta ${n} herida(s), o valida.`,
    sanctuaryHealWait: 'Los Pueblos Libres curan en el santuario…',
    threatWoundsYou: (n) =>
        `Asigna ${n} herida(s) de amenazas a tus compañeros.`,
    threatWoundsWait: 'Los Pueblos Libres asignan las heridas de amenazas…',
    siteWoundsYou: (n) =>
        `Asigna ${n} herida(s) del sitio a tus personajes.`,
    siteWoundsWait: (name) => `${name} asigna las heridas del sitio…`,
    clickDiscardHand: 'Haz clic en las cartas a descartar.',
    clickDesignate: 'Haz clic en una carta para designarla.',
    opponentDesignating: (name) => `${name} elige un objetivo.`,
    siteMoveClick: 'Haz clic en una carta para aplicar el efecto del sitio.',
    siteMoveYou: 'Puedes usar el efecto del sitio de llegada.',
    siteMoveWait: (name) => `${name} decide si usar el efecto del sitio…`,
    sitePhaseYou: 'Puedes usar el efecto del sitio (Sombra).',
    sitePhaseWait: 'La Sombra decide si usar el efecto del sitio…',
    optionalEffectYou: 'Puedes activar el efecto opcional de esta carta.',
    optionalEffectWait: (name) => `${name} decide un efecto opcional…`,
    preventAssignWait: (name) =>
        `${name} decide si impedir la asignación…`,
    responseWait: (name) => `Esperando la respuesta de ${name}…`,
    actionWait: (name) => `Esperando la reacción de ${name}…`,
    placeSite1: 'Coloca tu sitio 1 para empezar la aventura.',
    placeNextSite: 'Elige el siguiente sitio a colocar.',
    waitingSite: 'Esperando la selección del sitio…',
    fellowshipYou: 'Juega compañeros o apoyos, luego termina la fase.',
    fellowshipWait: 'El jugador de los Pueblos Libres prepara la compañía…',
    shadowYou: 'Juega esbirros, cazadores y apoyos.',
    shadowWait: 'El jugador Sombra prepara sus fuerzas…',
    archeryFpYou: (n) =>
        `Asigna tus ${n} herida(s) de arquería restantes a los compañeros.`,
    archeryFpWait: (n) =>
        `Los Pueblos Libres asignan ${n} herida(s) de arquería…`,
    archeryShadowYou: (n) =>
        `Asigna tus ${n} herida(s) de arquería restantes a los esbirros.`,
    archeryShadowWait: (n) =>
        `La Sombra asigna ${n} herida(s) de arquería…`,
    archeryOngoing: 'Fase de Arquería en curso…',
    assignFpYou: 'Asigna tus compañeros a los esbirros de la Sombra.',
    assignFpWait: 'Los Pueblos Libres hacen sus asignaciones de defensa…',
    assignShadowYou: 'Asigna tus esbirros restantes a los compañeros que elijas.',
    assignShadowWait: 'La Sombra asigna sus esbirros restantes…',
    assignOngoing: 'Fase de asignación de combates.',
    regroupShadowRefillYou: 'Ajusta tu mano (máx. 8 cartas) y valida.',
    regroupShadowRefillWait: 'La Sombra reorganiza su mano…',
    regroupFpRefillYou: 'Ajusta tu mano a 8 cartas y termina el turno.',
    regroupFpRefillWait:
        'Los Pueblos Libres preparan su mano para el siguiente turno…',
    regroupDecideYou: 'Elige avanzar al siguiente sitio o terminar el turno.',
    regroupDecideWait: 'Los Pueblos Libres deciden la continuación del viaje…',
};

export const INSTRUCTION_CATALOG: Record<
    SupportedLanguage,
    InstructionMessages
> = { fr, en, de, it, es };

export function getInstructions(
    lang: SupportedLanguage
): InstructionMessages {
    return INSTRUCTION_CATALOG[lang] ?? INSTRUCTION_CATALOG.fr;
}
