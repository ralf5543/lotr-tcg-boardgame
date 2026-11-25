import type { SupportedLanguage } from '../languages';
import type { AddTarget, CatalogFilterKey } from '../../decks/cardMeta';

export type DeckBuilderMessages = {
    title: string;
    loading: string;
    backToGame: string;
    newDeck: string;
    newShort: string;
    duplicate: string;
    delete: string;
    save: string;
    playAs0: string;
    playAs1: string;
    playVsBot: string;
    decks: string;
    you: string;
    youLower: string;
    bot: string;
    assignYou: string;
    assignBot: string;
    missingDeck: string;
    playable: string;
    incomplete: string;
    notPlayable: string;
    deckMeta: (fp: number, shadow: number, sites: number) => string;
    stats: (start: number, fp: number, shadow: number, sites: number) => string;
    nextCardTo: string;
    startingFellowship: string;
    ringBearer: string;
    oneRing: string;
    fellowshipCount: (cost: number) => string;
    freePeoples: (n: number) => string;
    shadow: (n: number) => string;
    adventure: (n: number) => string;
    addHint: string;
    searchPlaceholder: string;
    filterTypeAria: string;
    filterValueAria: string;
    addFilter: string;
    removeFilter: string;
    catalogLimit: string;
    noCards: string;
    problems: (n: number) => string;
    warnings: (n: number) => string;
    manageCopies: string;
    addCopy: string;
    removeCopy: string;
    costSuffix: (hint: string) => string;
    printedCost: (unit: number, printed: number) => string;
    target: Record<AddTarget, string>;
    filterDim: Record<CatalogFilterKey, string>;
    camp: {
        FREE_PEOPLE: string;
        SHADOW: string;
        SITE: string;
        RING_BEARER: string;
        RING: string;
    };
    deleteConfirm: (name: string) => string;
    errors: {
        loadDecks: string;
        save: string;
        create: string;
        duplicate: string;
        delete: string;
        assign: string;
        startMatch: string;
        serverFull: string;
        startBot: string;
    };
};

const fr: DeckBuilderMessages = {
    title: 'Création de deck',
    loading: 'Chargement des decks…',
    backToGame: 'Retour partie',
    newDeck: 'Nouveau deck',
    newShort: 'Nouveau',
    duplicate: 'Dupliquer',
    delete: 'Supprimer',
    save: 'Sauvegarder',
    playAs0: 'Jouer (joueur 0)',
    playAs1: 'Jouer (joueur 1)',
    playVsBot: 'Affronter un BOT',
    decks: 'Decks',
    you: 'Toi',
    youLower: 'toi',
    bot: 'BOT',
    assignYou: 'Ce deck → toi',
    assignBot: 'Ce deck → BOT',
    missingDeck: 'Deck manquant',
    playable: 'Jouable',
    incomplete: 'Incomplet',
    notPlayable: 'Non jouable',
    deckMeta: (fp, shadow, sites) =>
        `${fp}/${shadow} · ${sites} sites`,
    stats: (start, fp, shadow, sites) =>
        `Départ ${start}/4 · Peuples Libres ${fp} · Ombre ${shadow} · Aventure ${sites}/9`,
    nextCardTo: 'Prochaine carte du catalogue →',
    startingFellowship: 'Compagnie de départ',
    ringBearer: 'Porteur',
    oneRing: 'Anneau Unique',
    fellowshipCount: (cost) => `Compagnie (${cost}/4)`,
    freePeoples: (n) => `Peuples Libres (${n})`,
    shadow: (n) => `Ombre (${n})`,
    adventure: (n) => `Aventure (${n}/9)`,
    addHint: '+ Ajouter',
    searchPlaceholder: 'Rechercher une carte…',
    filterTypeAria: 'Type de filtre',
    filterValueAria: 'Valeur du filtre',
    addFilter: 'Ajouter…',
    removeFilter: 'Retirer ce filtre',
    catalogLimit:
        'Affichage limité à 250 — affine la recherche ou les filtres.',
    noCards: 'Aucune carte pour ces filtres.',
    problems: (n) => `${n} problème${n > 1 ? 's' : ''}`,
    warnings: (n) => `${n} avertissement${n > 1 ? 's' : ''}`,
    manageCopies: 'Gérer les exemplaires',
    addCopy: '+ Ajouter un exemplaire',
    removeCopy: '− Retirer un exemplaire',
    costSuffix: (hint) => `· coût ${hint}`,
    printedCost: (unit, printed) => `${unit} (impr. ${printed})`,
    target: {
        freePeople: 'Pioche Peuples Libres',
        shadow: 'Pioche Ombre',
        siteIds: "Paquet d'aventure",
        startingCompanionIds: 'Compagnie de départ',
        ringBearerId: 'Porteur',
        oneRingId: 'Anneau Unique',
    },
    filterDim: {
        camp: 'Camp',
        type: 'Type',
        culture: 'Culture',
        race: 'Race',
        subtype: 'Sous-type',
        keyword: 'Mot-clé',
    },
    camp: {
        FREE_PEOPLE: 'Peuples Libres',
        SHADOW: 'Ombre',
        SITE: "Paquet d'aventure",
        RING_BEARER: 'Porteurs',
        RING: 'Anneaux',
    },
    deleteConfirm: (name) => `Supprimer « ${name} » ?`,
    errors: {
        loadDecks: 'Impossible de charger les decks.',
        save: 'Sauvegarde impossible (Vite allumé ?).',
        create: 'Création impossible.',
        duplicate: 'Duplication impossible.',
        delete: 'Suppression impossible.',
        assign: 'Impossible d’attribuer ce deck.',
        startMatch: 'Impossible de créer la partie (serveur allumé ?).',
        serverFull:
            'Serveur plein : trop de parties en cours. Réessaie plus tard.',
        startBot: 'Impossible de lancer la partie contre le BOT.',
    },
};

const en: DeckBuilderMessages = {
    title: 'Deck builder',
    loading: 'Loading decks…',
    backToGame: 'Back to game',
    newDeck: 'New deck',
    newShort: 'New',
    duplicate: 'Duplicate',
    delete: 'Delete',
    save: 'Save',
    playAs0: 'Play (player 0)',
    playAs1: 'Play (player 1)',
    playVsBot: 'Face a BOT',
    decks: 'Decks',
    you: 'You',
    youLower: 'you',
    bot: 'BOT',
    assignYou: 'This deck → you',
    assignBot: 'This deck → BOT',
    missingDeck: 'Missing deck',
    playable: 'Legal',
    incomplete: 'Incomplete',
    notPlayable: 'Not legal',
    deckMeta: (fp, shadow, sites) =>
        `${fp}/${shadow} · ${sites} sites`,
    stats: (start, fp, shadow, sites) =>
        `Starting ${start}/4 · Free Peoples ${fp} · Shadow ${shadow} · Adventure ${sites}/9`,
    nextCardTo: 'Next catalog card →',
    startingFellowship: 'Starting fellowship',
    ringBearer: 'Ring-bearer',
    oneRing: 'The One Ring',
    fellowshipCount: (cost) => `Fellowship (${cost}/4)`,
    freePeoples: (n) => `Free Peoples (${n})`,
    shadow: (n) => `Shadow (${n})`,
    adventure: (n) => `Adventure (${n}/9)`,
    addHint: '+ Add',
    searchPlaceholder: 'Search for a card…',
    filterTypeAria: 'Filter type',
    filterValueAria: 'Filter value',
    addFilter: 'Add…',
    removeFilter: 'Remove this filter',
    catalogLimit: 'Showing 250 max — refine search or filters.',
    noCards: 'No cards for these filters.',
    problems: (n) => `${n} problem${n > 1 ? 's' : ''}`,
    warnings: (n) => `${n} warning${n > 1 ? 's' : ''}`,
    manageCopies: 'Manage copies',
    addCopy: '+ Add a copy',
    removeCopy: '− Remove a copy',
    costSuffix: (hint) => `· cost ${hint}`,
    printedCost: (unit, printed) => `${unit} (print ${printed})`,
    target: {
        freePeople: 'Free Peoples draw deck',
        shadow: 'Shadow draw deck',
        siteIds: 'Adventure deck',
        startingCompanionIds: 'Starting fellowship',
        ringBearerId: 'Ring-bearer',
        oneRingId: 'The One Ring',
    },
    filterDim: {
        camp: 'Side',
        type: 'Type',
        culture: 'Culture',
        race: 'Race',
        subtype: 'Subtype',
        keyword: 'Keyword',
    },
    camp: {
        FREE_PEOPLE: 'Free Peoples',
        SHADOW: 'Shadow',
        SITE: 'Adventure deck',
        RING_BEARER: 'Ring-bearers',
        RING: 'Rings',
    },
    deleteConfirm: (name) => `Delete “${name}”?`,
    errors: {
        loadDecks: 'Could not load decks.',
        save: 'Save failed (is Vite running?).',
        create: 'Could not create.',
        duplicate: 'Could not duplicate.',
        delete: 'Could not delete.',
        assign: 'Could not assign this deck.',
        startMatch: 'Could not start the match (is the server running?).',
        serverFull: 'Server full: too many active matches. Try again later.',
        startBot: 'Could not start a match against the BOT.',
    },
};

const de: DeckBuilderMessages = {
    title: 'Deck erstellen',
    loading: 'Decks werden geladen…',
    backToGame: 'Zurück zum Spiel',
    newDeck: 'Neues Deck',
    newShort: 'Neu',
    duplicate: 'Duplizieren',
    delete: 'Löschen',
    save: 'Speichern',
    playAs0: 'Spielen (Spieler 0)',
    playAs1: 'Spielen (Spieler 1)',
    playVsBot: 'Gegen BOT spielen',
    decks: 'Decks',
    you: 'Du',
    youLower: 'du',
    bot: 'BOT',
    assignYou: 'Dieses Deck → du',
    assignBot: 'Dieses Deck → BOT',
    missingDeck: 'Deck fehlt',
    playable: 'Spielbar',
    incomplete: 'Unvollständig',
    notPlayable: 'Nicht spielbar',
    deckMeta: (fp, shadow, sites) =>
        `${fp}/${shadow} · ${sites} Orte`,
    stats: (start, fp, shadow, sites) =>
        `Start ${start}/4 · Freie Völker ${fp} · Schatten ${shadow} · Abenteuer ${sites}/9`,
    nextCardTo: 'Nächste Katalogkarte →',
    startingFellowship: 'Startgemeinschaft',
    ringBearer: 'Ringträger',
    oneRing: 'Der Eine Ring',
    fellowshipCount: (cost) => `Gemeinschaft (${cost}/4)`,
    freePeoples: (n) => `Freie Völker (${n})`,
    shadow: (n) => `Schatten (${n})`,
    adventure: (n) => `Abenteuer (${n}/9)`,
    addHint: '+ Hinzufügen',
    searchPlaceholder: 'Karte suchen…',
    filterTypeAria: 'Filtertyp',
    filterValueAria: 'Filterwert',
    addFilter: 'Hinzufügen…',
    removeFilter: 'Filter entfernen',
    catalogLimit: 'Max. 250 — Suche oder Filter verfeinern.',
    noCards: 'Keine Karten für diese Filter.',
    problems: (n) => `${n} Problem${n > 1 ? 'e' : ''}`,
    warnings: (n) => `${n} Warnung${n > 1 ? 'en' : ''}`,
    manageCopies: 'Exemplare verwalten',
    addCopy: '+ Exemplar hinzufügen',
    removeCopy: '− Exemplar entfernen',
    costSuffix: (hint) => `· Kosten ${hint}`,
    printedCost: (unit, printed) => `${unit} (Druck ${printed})`,
    target: {
        freePeople: 'Nachziehstapel Freie Völker',
        shadow: 'Nachziehstapel Schatten',
        siteIds: 'Abenteuerdeck',
        startingCompanionIds: 'Startgemeinschaft',
        ringBearerId: 'Ringträger',
        oneRingId: 'Der Eine Ring',
    },
    filterDim: {
        camp: 'Seite',
        type: 'Typ',
        culture: 'Kultur',
        race: 'Volk',
        subtype: 'Untertyp',
        keyword: 'Schlüsselwort',
    },
    camp: {
        FREE_PEOPLE: 'Freie Völker',
        SHADOW: 'Schatten',
        SITE: 'Abenteuerdeck',
        RING_BEARER: 'Ringträger',
        RING: 'Ringe',
    },
    deleteConfirm: (name) => `« ${name} » löschen?`,
    errors: {
        loadDecks: 'Decks konnten nicht geladen werden.',
        save: 'Speichern fehlgeschlagen (läuft Vite?).',
        create: 'Erstellen fehlgeschlagen.',
        duplicate: 'Duplizieren fehlgeschlagen.',
        delete: 'Löschen fehlgeschlagen.',
        assign: 'Deck konnte nicht zugewiesen werden.',
        startMatch: 'Partie konnte nicht erstellt werden (Server an?).',
        serverFull:
            'Server voll: zu viele laufende Partien. Bitte später erneut versuchen.',
        startBot: 'Partie gegen BOT konnte nicht gestartet werden.',
    },
};

const it: DeckBuilderMessages = {
    title: 'Creazione mazzo',
    loading: 'Caricamento mazzi…',
    backToGame: 'Torna alla partita',
    newDeck: 'Nuovo mazzo',
    newShort: 'Nuovo',
    duplicate: 'Duplica',
    delete: 'Elimina',
    save: 'Salva',
    playAs0: 'Gioca (giocatore 0)',
    playAs1: 'Gioca (giocatore 1)',
    playVsBot: 'Affronta un BOT',
    decks: 'Mazzi',
    you: 'Tu',
    youLower: 'tu',
    bot: 'BOT',
    assignYou: 'Questo mazzo → tu',
    assignBot: 'Questo mazzo → BOT',
    missingDeck: 'Mazzo mancante',
    playable: 'Giocabile',
    incomplete: 'Incompleto',
    notPlayable: 'Non giocabile',
    deckMeta: (fp, shadow, sites) =>
        `${fp}/${shadow} · ${sites} siti`,
    stats: (start, fp, shadow, sites) =>
        `Partenza ${start}/4 · Popoli Liberi ${fp} · Ombra ${shadow} · Avventura ${sites}/9`,
    nextCardTo: 'Prossima carta del catalogo →',
    startingFellowship: 'Compagnia iniziale',
    ringBearer: 'Portatore',
    oneRing: 'L’Unico Anello',
    fellowshipCount: (cost) => `Compagnia (${cost}/4)`,
    freePeoples: (n) => `Popoli Liberi (${n})`,
    shadow: (n) => `Ombra (${n})`,
    adventure: (n) => `Avventura (${n}/9)`,
    addHint: '+ Aggiungi',
    searchPlaceholder: 'Cerca una carta…',
    filterTypeAria: 'Tipo di filtro',
    filterValueAria: 'Valore del filtro',
    addFilter: 'Aggiungi…',
    removeFilter: 'Rimuovi questo filtro',
    catalogLimit: 'Max 250 — affina ricerca o filtri.',
    noCards: 'Nessuna carta per questi filtri.',
    problems: (n) => `${n} problem${n > 1 ? 'i' : 'a'}`,
    warnings: (n) => `${n} avvertiment${n > 1 ? 'i' : 'o'}`,
    manageCopies: 'Gestisci le copie',
    addCopy: '+ Aggiungi una copia',
    removeCopy: '− Rimuovi una copia',
    costSuffix: (hint) => `· costo ${hint}`,
    printedCost: (unit, printed) => `${unit} (stampa ${printed})`,
    target: {
        freePeople: 'Mazzo Popoli Liberi',
        shadow: 'Mazzo Ombra',
        siteIds: 'Mazzo d’avventura',
        startingCompanionIds: 'Compagnia iniziale',
        ringBearerId: 'Portatore',
        oneRingId: 'L’Unico Anello',
    },
    filterDim: {
        camp: 'Campo',
        type: 'Tipo',
        culture: 'Cultura',
        race: 'Razza',
        subtype: 'Sottotipo',
        keyword: 'Parola chiave',
    },
    camp: {
        FREE_PEOPLE: 'Popoli Liberi',
        SHADOW: 'Ombra',
        SITE: 'Mazzo d’avventura',
        RING_BEARER: 'Portatori',
        RING: 'Anelli',
    },
    deleteConfirm: (name) => `Eliminare « ${name} »?`,
    errors: {
        loadDecks: 'Impossibile caricare i mazzi.',
        save: 'Salvataggio impossibile (Vite acceso?).',
        create: 'Creazione impossibile.',
        duplicate: 'Duplicazione impossibile.',
        delete: 'Eliminazione impossibile.',
        assign: 'Impossibile assegnare questo mazzo.',
        startMatch: 'Impossibile creare la partita (server acceso?).',
        serverFull:
            'Server pieno: troppe partite attive. Riprova più tardi.',
        startBot: 'Impossibile avviare la partita contro il BOT.',
    },
};

const es: DeckBuilderMessages = {
    title: 'Creación de mazo',
    loading: 'Cargando mazos…',
    backToGame: 'Volver a la partida',
    newDeck: 'Nuevo mazo',
    newShort: 'Nuevo',
    duplicate: 'Duplicar',
    delete: 'Eliminar',
    save: 'Guardar',
    playAs0: 'Jugar (jugador 0)',
    playAs1: 'Jugar (jugador 1)',
    playVsBot: 'Enfrentar a un BOT',
    decks: 'Mazos',
    you: 'Tú',
    youLower: 'tú',
    bot: 'BOT',
    assignYou: 'Este mazo → tú',
    assignBot: 'Este mazo → BOT',
    missingDeck: 'Mazo ausente',
    playable: 'Jugable',
    incomplete: 'Incompleto',
    notPlayable: 'No jugable',
    deckMeta: (fp, shadow, sites) =>
        `${fp}/${shadow} · ${sites} sitios`,
    stats: (start, fp, shadow, sites) =>
        `Inicio ${start}/4 · Pueblos Libres ${fp} · Sombra ${shadow} · Aventura ${sites}/9`,
    nextCardTo: 'Siguiente carta del catálogo →',
    startingFellowship: 'Compañía inicial',
    ringBearer: 'Portador',
    oneRing: 'El Anillo Único',
    fellowshipCount: (cost) => `Compañía (${cost}/4)`,
    freePeoples: (n) => `Pueblos Libres (${n})`,
    shadow: (n) => `Sombra (${n})`,
    adventure: (n) => `Aventura (${n}/9)`,
    addHint: '+ Añadir',
    searchPlaceholder: 'Buscar una carta…',
    filterTypeAria: 'Tipo de filtro',
    filterValueAria: 'Valor del filtro',
    addFilter: 'Añadir…',
    removeFilter: 'Quitar este filtro',
    catalogLimit: 'Máx. 250 — afina la búsqueda o los filtros.',
    noCards: 'Ninguna carta para estos filtros.',
    problems: (n) => `${n} problema${n > 1 ? 's' : ''}`,
    warnings: (n) => `${n} aviso${n > 1 ? 's' : ''}`,
    manageCopies: 'Gestionar ejemplares',
    addCopy: '+ Añadir un ejemplar',
    removeCopy: '− Quitar un ejemplar',
    costSuffix: (hint) => `· coste ${hint}`,
    printedCost: (unit, printed) => `${unit} (imp. ${printed})`,
    target: {
        freePeople: 'Mazo Pueblos Libres',
        shadow: 'Mazo Sombra',
        siteIds: 'Mazo de aventura',
        startingCompanionIds: 'Compañía inicial',
        ringBearerId: 'Portador',
        oneRingId: 'El Anillo Único',
    },
    filterDim: {
        camp: 'Bando',
        type: 'Tipo',
        culture: 'Cultura',
        race: 'Raza',
        subtype: 'Subtipo',
        keyword: 'Palabra clave',
    },
    camp: {
        FREE_PEOPLE: 'Pueblos Libres',
        SHADOW: 'Sombra',
        SITE: 'Mazo de aventura',
        RING_BEARER: 'Portadores',
        RING: 'Anillos',
    },
    deleteConfirm: (name) => `¿Eliminar « ${name} »?`,
    errors: {
        loadDecks: 'No se pudieron cargar los mazos.',
        save: 'Guardado imposible (¿Vite encendido?).',
        create: 'Creación imposible.',
        duplicate: 'Duplicación imposible.',
        delete: 'Eliminación imposible.',
        assign: 'No se pudo asignar este mazo.',
        startMatch: 'No se pudo crear la partida (¿servidor encendido?).',
        serverFull:
            'Servidor lleno: demasiadas partidas activas. Inténtalo más tarde.',
        startBot: 'No se pudo lanzar la partida contra el BOT.',
    },
};

export const DECK_BUILDER_MESSAGES: Record<
    SupportedLanguage,
    DeckBuilderMessages
> = { fr, en, de, it, es };
