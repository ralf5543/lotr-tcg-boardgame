import type { SupportedLanguage } from '../languages';
import { CHROME_MESSAGES, type ChromeMessages } from './chrome';
import {
    DECK_BUILDER_MESSAGES,
    type DeckBuilderMessages,
} from './deckBuilder';
import {
    TARGETING_MESSAGES,
    type TargetingMessages,
} from './targeting';

/** Chaînes d’interface (chrome). Les consignes moteur arriveront plus tard. */
export type UiMessages = {
    chrome: ChromeMessages;
    targeting: TargetingMessages;
    deckBuilder: DeckBuilderMessages;
    options: {
        title: string;
        close: string;
        closeAria: string;
        categoriesAria: string;
        tabs: {
            display: string;
            audio: string;
            language: string;
            account: string;
        };
        display: {
            title: string;
            hint: string;
            fullscreen: string;
            fullscreenHint: string;
            laterNote: string;
        };
        audio: {
            title: string;
            hint: string;
            music: string;
            musicHint: string;
            master: string;
            musicVolume: string;
            sfx: string;
        };
        language: {
            title: string;
            hint: string;
            ui: string;
            cards: string;
            cardsHint: string;
        };
        account: {
            title: string;
            hint: string;
            displayName: string;
            displayNameHint: string;
            displayNamePlaceholder: string;
            avatar: string;
            avatarHint: string;
            avatarOption: string;
            contacts: string;
            contactsHint: string;
            decks: string;
            decksHint: string;
            soon: string;
        };
        quit: string;
        quitPrompt: string;
        cancel: string;
        confirm: string;
    };
    dock: {
        hand: string;
        sites: string;
        options: string;
    };
    welcome: {
        menuAria: string;
        collection: string;
        play: string;
        create: string;
        join: string;
        tutorial: string;
        soon: string;
    };
    match: {
        connecting: string;
        seatTaken: string;
        matchFull: string;
        notFound: string;
        joinFailed: string;
        backHome: string;
        creating: string;
        joining: string;
        codeLabel: string;
        codeHint: string;
        copyCode: string;
        copied: string;
        enterMatch: string;
        waitingOpponent: string;
        opponentJoined: string;
        cancelHostPrompt: string;
        cannotJoinOwn: string;
        joinCodeLabel: string;
        joinCodePlaceholder: string;
        joinSubmit: string;
        invalidCode: string;
        cancel: string;
    };
};

type UiBase = Omit<UiMessages, 'chrome' | 'targeting' | 'deckBuilder'>;

const fr: UiBase = {
    options: {
        title: 'Options',
        close: 'Fermer',
        closeAria: 'Fermer',
        categoriesAria: 'Catégories',
        tabs: {
            display: 'Affichage',
            audio: 'Son',
            language: 'Langue',
            account: 'Compte',
        },
        display: {
            title: 'Affichage',
            hint: 'Le plateau est déjà proportionnel : pas de choix de résolution pour l’instant.',
            fullscreen: 'Plein écran',
            fullscreenHint: 'Échap n’en sort plus — décochez ici',
            laterNote:
                'Plus tard : cadre décoratif autour du plateau (effet type Hearthstone sur grands écrans), sans toucher à l’échelle du jeu.',
        },
        audio: {
            title: 'Son',
            hint: 'Réglages locaux — pas encore reliés au moteur audio.',
            music: 'Musique',
            musicHint: 'Pas de piste pour l’instant',
            master: 'Volume global',
            musicVolume: 'Musique',
            sfx: 'Effets sonores',
        },
        language: {
            title: 'Langue',
            hint: 'Interface et textes de cartes sont indépendants.',
            ui: 'Langue de l’interface',
            cards: 'Langue des cartes',
            cardsHint: 'Titres, lore et gametext affichés',
        },
        account: {
            title: 'Compte',
            hint: 'Profil local sur cet appareil — pas encore de compte serveur.',
            displayName: 'Nom affiché',
            displayNameHint: 'Visible en partie (journal, bandeau…)',
            displayNamePlaceholder: 'Votre nom',
            avatar: 'Avatar',
            avatarHint: 'Tous les portraits du dossier — pas d’image personnelle',
            avatarOption: 'Avatar {n}',
            contacts: 'Contacts',
            contactsHint: 'Liste d’amis — bientôt',
            decks: 'Mes decks',
            decksHint: 'Gérer la liste de decks',
            soon: 'bientôt',
        },
        quit: 'Retour à l’accueil',
        quitPrompt: 'Quitter la partie et revenir à l’accueil ?',
        cancel: 'Annuler',
        confirm: 'Confirmer',
    },
    dock: {
        hand: 'Main',
        sites: 'Sites',
        options: 'Options',
    },
    welcome: {
        menuAria: 'Menu principal',
        collection: 'Ma collection',
        play: 'Jouer',
        create: 'Créer une partie',
        join: 'Rejoindre une partie',
        tutorial: 'Tutoriel',
        soon: 'Bientôt',
    },
    match: {
        connecting: 'Connexion à la partie…',
        seatTaken: 'Ce siège est déjà pris.',
        matchFull: 'Cette partie est complète.',
        notFound: 'Partie introuvable.',
        joinFailed: 'Impossible de rejoindre la partie.',
        backHome: 'Retour à l’accueil',
        creating: 'Création de la partie…',
        joining: 'Entrée en cours…',
        codeLabel: 'Code de partie',
        codeHint: 'Donnez ce code à votre adversaire. La partie ne démarre que lorsqu’il a rejoint.',
        copyCode: 'Copier le code',
        copied: 'Copié',
        enterMatch: 'Entrer dans la partie',
        waitingOpponent: 'En attente de l’adversaire…',
        opponentJoined: 'Adversaire connecté — entrée…',
        cancelHostPrompt:
            'Quitter l’attente annulera la partie : le code ne sera plus utilisable. Continuer ?',
        cannotJoinOwn: 'Vous êtes déjà l’hôte de cette partie.',
        joinCodeLabel: 'Code de la partie',
        joinCodePlaceholder: 'Collez le code reçu',
        joinSubmit: 'Rejoindre la partie',
        invalidCode: 'Code invalide.',
        cancel: 'Retour',
    },
};

const en: UiBase = {
    options: {
        title: 'Options',
        close: 'Close',
        closeAria: 'Close',
        categoriesAria: 'Categories',
        tabs: {
            display: 'Display',
            audio: 'Sound',
            language: 'Language',
            account: 'Account',
        },
        display: {
            title: 'Display',
            hint: 'The board already scales proportionally: no resolution choice for now.',
            fullscreen: 'Fullscreen',
            fullscreenHint: 'Escape no longer exits — uncheck here',
            laterNote:
                'Later: decorative frame around the board (Hearthstone-style on large screens), without changing the game scale.',
        },
        audio: {
            title: 'Sound',
            hint: 'Local settings — not wired to the audio engine yet.',
            music: 'Music',
            musicHint: 'No track yet',
            master: 'Master volume',
            musicVolume: 'Music',
            sfx: 'Sound effects',
        },
        language: {
            title: 'Language',
            hint: 'Interface and card text are independent.',
            ui: 'Interface language',
            cards: 'Card language',
            cardsHint: 'Displayed titles, lore and gametext',
        },
        account: {
            title: 'Account',
            hint: 'Local profile on this device — no server account yet.',
            displayName: 'Display name',
            displayNameHint: 'Shown in-game (log, banner…)',
            displayNamePlaceholder: 'Your name',
            avatar: 'Avatar',
            avatarHint: 'Every portrait in the folder — no personal uploads',
            avatarOption: 'Avatar {n}',
            contacts: 'Contacts',
            contactsHint: 'Friends list — coming soon',
            decks: 'My decks',
            decksHint: 'Manage your deck list',
            soon: 'coming soon',
        },
        quit: 'Back to home',
        quitPrompt: 'Leave the match and return to home?',
        cancel: 'Cancel',
        confirm: 'Confirm',
    },
    dock: {
        hand: 'Hand',
        sites: 'Sites',
        options: 'Options',
    },
    welcome: {
        menuAria: 'Main menu',
        collection: 'My collection',
        play: 'Play',
        create: 'Create a match',
        join: 'Join a match',
        tutorial: 'Tutorial',
        soon: 'Coming soon',
    },
    match: {
        connecting: 'Connecting to the match…',
        seatTaken: 'This seat is already taken.',
        matchFull: 'This match is full.',
        notFound: 'Match not found.',
        joinFailed: 'Could not join the match.',
        backHome: 'Back to home',
        creating: 'Creating the match…',
        joining: 'Joining…',
        codeLabel: 'Match code',
        codeHint: 'Give this code to your opponent. The match starts only once they have joined.',
        copyCode: 'Copy code',
        copied: 'Copied',
        enterMatch: 'Enter the match',
        waitingOpponent: 'Waiting for opponent…',
        opponentJoined: 'Opponent joined — entering…',
        cancelHostPrompt:
            'Leaving will cancel the match: the code will no longer work. Continue?',
        cannotJoinOwn: 'You are already the host of this match.',
        joinCodeLabel: 'Match code',
        joinCodePlaceholder: 'Paste the code you received',
        joinSubmit: 'Join the match',
        invalidCode: 'Invalid code.',
        cancel: 'Back',
    },
};

const de: UiBase = {
    options: {
        title: 'Optionen',
        close: 'Schließen',
        closeAria: 'Schließen',
        categoriesAria: 'Kategorien',
        tabs: {
            display: 'Anzeige',
            audio: 'Ton',
            language: 'Sprache',
            account: 'Konto',
        },
        display: {
            title: 'Anzeige',
            hint: 'Das Spielfeld skaliert bereits proportional: vorerst keine Auflösungswahl.',
            fullscreen: 'Vollbild',
            fullscreenHint: 'Escape beendet es nicht mehr — hier abwählen',
            laterNote:
                'Später: dekorativer Rahmen um das Spielfeld (Hearthstone-Stil auf großen Bildschirmen), ohne die Spielskala zu ändern.',
        },
        audio: {
            title: 'Ton',
            hint: 'Lokale Einstellungen — noch nicht mit der Audio-Engine verbunden.',
            music: 'Musik',
            musicHint: 'Noch kein Titel',
            master: 'Gesamtlautstärke',
            musicVolume: 'Musik',
            sfx: 'Soundeffekte',
        },
        language: {
            title: 'Sprache',
            hint: 'Oberfläche und Kartentexte sind unabhängig.',
            ui: 'Sprache der Oberfläche',
            cards: 'Sprache der Karten',
            cardsHint: 'Angezeigte Titel, Lore und Spieltext',
        },
        account: {
            title: 'Konto',
            hint: 'Lokales Profil auf diesem Gerät — noch kein Serverkonto.',
            displayName: 'Anzeigename',
            displayNameHint: 'Im Spiel sichtbar (Log, Banner…)',
            displayNamePlaceholder: 'Dein Name',
            avatar: 'Avatar',
            avatarHint: 'Alle Porträts im Ordner — kein eigenes Bild',
            avatarOption: 'Avatar {n}',
            contacts: 'Kontakte',
            contactsHint: 'Freundesliste — demnächst',
            decks: 'Meine Decks',
            decksHint: 'Deckliste verwalten',
            soon: 'demnächst',
        },
        quit: 'Zurück zum Start',
        quitPrompt: 'Partie verlassen und zum Startbildschirm?',
        cancel: 'Abbrechen',
        confirm: 'Bestätigen',
    },
    dock: {
        hand: 'Hand',
        sites: 'Orte',
        options: 'Optionen',
    },
    welcome: {
        menuAria: 'Hauptmenü',
        collection: 'Meine Sammlung',
        play: 'Spielen',
        create: 'Partie erstellen',
        join: 'Einer Partie beitreten',
        tutorial: 'Tutorial',
        soon: 'Demnächst',
    },
    match: {
        connecting: 'Verbindung zur Partie…',
        seatTaken: 'Dieser Platz ist bereits belegt.',
        matchFull: 'Diese Partie ist voll.',
        notFound: 'Partie nicht gefunden.',
        joinFailed: 'Beitritt zur Partie fehlgeschlagen.',
        backHome: 'Zurück zum Start',
        creating: 'Partie wird erstellt…',
        joining: 'Beitritt läuft…',
        codeLabel: 'Partiecode',
        codeHint: 'Gib diesen Code deinem Gegner. Die Partie startet erst, wenn er beigetreten ist.',
        copyCode: 'Code kopieren',
        copied: 'Kopiert',
        enterMatch: 'Zur Partie',
        waitingOpponent: 'Warte auf Gegner…',
        opponentJoined: 'Gegner da — Eintritt…',
        cancelHostPrompt:
            'Wenn du gehst, wird die Partie abgebrochen: der Code gilt nicht mehr. Weiter?',
        cannotJoinOwn: 'Du bist bereits Gastgeber dieser Partie.',
        joinCodeLabel: 'Partiecode',
        joinCodePlaceholder: 'Erhaltenen Code einfügen',
        joinSubmit: 'Der Partie beitreten',
        invalidCode: 'Ungültiger Code.',
        cancel: 'Zurück',
    },
};

const it: UiBase = {
    options: {
        title: 'Opzioni',
        close: 'Chiudi',
        closeAria: 'Chiudi',
        categoriesAria: 'Categorie',
        tabs: {
            display: 'Schermo',
            audio: 'Suono',
            language: 'Lingua',
            account: 'Account',
        },
        display: {
            title: 'Schermo',
            hint: 'Il tavolo è già proporzionale: per ora nessuna scelta di risoluzione.',
            fullscreen: 'Schermo intero',
            fullscreenHint: 'Esc non lo chiude più — deseleziona qui',
            laterNote:
                'Più avanti: cornice decorativa intorno al tavolo (stile Hearthstone su schermi grandi), senza cambiare la scala di gioco.',
        },
        audio: {
            title: 'Suono',
            hint: 'Impostazioni locali — non ancora collegate al motore audio.',
            music: 'Musica',
            musicHint: 'Nessuna traccia per ora',
            master: 'Volume generale',
            musicVolume: 'Musica',
            sfx: 'Effetti sonori',
        },
        language: {
            title: 'Lingua',
            hint: 'Interfaccia e testi delle carte sono indipendenti.',
            ui: 'Lingua dell’interfaccia',
            cards: 'Lingua delle carte',
            cardsHint: 'Titoli, lore e testo di gioco mostrati',
        },
        account: {
            title: 'Account',
            hint: 'Profilo locale su questo dispositivo — niente account server per ora.',
            displayName: 'Nome visualizzato',
            displayNameHint: 'Visibile in partita (diario, banner…)',
            displayNamePlaceholder: 'Il tuo nome',
            avatar: 'Avatar',
            avatarHint: 'Tutti i ritratti nella cartella — niente immagini personali',
            avatarOption: 'Avatar {n}',
            contacts: 'Contatti',
            contactsHint: 'Lista amici — presto',
            decks: 'I miei mazzi',
            decksHint: 'Gestire l’elenco dei mazzi',
            soon: 'presto',
        },
        quit: 'Torna al menu',
        quitPrompt: 'Lasciare la partita e tornare al menu?',
        cancel: 'Annulla',
        confirm: 'Conferma',
    },
    dock: {
        hand: 'Mano',
        sites: 'Siti',
        options: 'Opzioni',
    },
    welcome: {
        menuAria: 'Menu principale',
        collection: 'La mia collezione',
        play: 'Gioca',
        create: 'Crea una partita',
        join: 'Unisciti a una partita',
        tutorial: 'Tutorial',
        soon: 'Presto',
    },
    match: {
        connecting: 'Connessione alla partita…',
        seatTaken: 'Questo posto è già occupato.',
        matchFull: 'Questa partita è completa.',
        notFound: 'Partita non trovata.',
        joinFailed: 'Impossibile unirsi alla partita.',
        backHome: 'Torna al menu',
        creating: 'Creazione della partita…',
        joining: 'Ingresso in corso…',
        codeLabel: 'Codice partita',
        codeHint: 'Dai questo codice al tuo avversario. La partita inizia solo quando è entrato.',
        copyCode: 'Copia il codice',
        copied: 'Copiato',
        enterMatch: 'Entra nella partita',
        waitingOpponent: 'In attesa dell’avversario…',
        opponentJoined: 'Avversario connesso — ingresso…',
        cancelHostPrompt:
            'Uscendo annulli la partita: il codice non sarà più valido. Continuare?',
        cannotJoinOwn: 'Sei già l’host di questa partita.',
        joinCodeLabel: 'Codice della partita',
        joinCodePlaceholder: 'Incolla il codice ricevuto',
        joinSubmit: 'Unisciti alla partita',
        invalidCode: 'Codice non valido.',
        cancel: 'Indietro',
    },
};

const es: UiBase = {
    options: {
        title: 'Opciones',
        close: 'Cerrar',
        closeAria: 'Cerrar',
        categoriesAria: 'Categorías',
        tabs: {
            display: 'Pantalla',
            audio: 'Sonido',
            language: 'Idioma',
            account: 'Cuenta',
        },
        display: {
            title: 'Pantalla',
            hint: 'El tablero ya escala de forma proporcional: de momento no hay elección de resolución.',
            fullscreen: 'Pantalla completa',
            fullscreenHint: 'Esc ya no sale — desmárcalo aquí',
            laterNote:
                'Más adelante: marco decorativo alrededor del tablero (estilo Hearthstone en pantallas grandes), sin cambiar la escala del juego.',
        },
        audio: {
            title: 'Sonido',
            hint: 'Ajustes locales — aún no conectados al motor de audio.',
            music: 'Música',
            musicHint: 'Sin pista por ahora',
            master: 'Volumen general',
            musicVolume: 'Música',
            sfx: 'Efectos de sonido',
        },
        language: {
            title: 'Idioma',
            hint: 'La interfaz y los textos de las cartas son independientes.',
            ui: 'Idioma de la interfaz',
            cards: 'Idioma de las cartas',
            cardsHint: 'Títulos, lore y texto de juego mostrados',
        },
        account: {
            title: 'Cuenta',
            hint: 'Perfil local en este dispositivo — aún sin cuenta en el servidor.',
            displayName: 'Nombre mostrado',
            displayNameHint: 'Visible en partida (diario, banner…)',
            displayNamePlaceholder: 'Tu nombre',
            avatar: 'Avatar',
            avatarHint: 'Todos los retratos de la carpeta — sin imagen personal',
            avatarOption: 'Avatar {n}',
            contacts: 'Contactos',
            contactsHint: 'Lista de amigos — pronto',
            decks: 'Mis mazos',
            decksHint: 'Gestionar la lista de mazos',
            soon: 'pronto',
        },
        quit: 'Volver al inicio',
        quitPrompt: '¿Dejar la partida y volver al inicio?',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
    },
    dock: {
        hand: 'Mano',
        sites: 'Sitios',
        options: 'Opciones',
    },
    welcome: {
        menuAria: 'Menú principal',
        collection: 'Mi colección',
        play: 'Jugar',
        create: 'Crear una partida',
        join: 'Unirse a una partida',
        tutorial: 'Tutorial',
        soon: 'Pronto',
    },
    match: {
        connecting: 'Conectando a la partida…',
        seatTaken: 'Este asiento ya está ocupado.',
        matchFull: 'Esta partida está completa.',
        notFound: 'Partida no encontrada.',
        joinFailed: 'No se pudo unir a la partida.',
        backHome: 'Volver al inicio',
        creating: 'Creando la partida…',
        joining: 'Entrando…',
        codeLabel: 'Código de partida',
        codeHint: 'Dale este código a tu adversario. La partida solo empieza cuando se haya unido.',
        copyCode: 'Copiar código',
        copied: 'Copiado',
        enterMatch: 'Entrar en la partida',
        waitingOpponent: 'Esperando al adversario…',
        opponentJoined: 'Adversario conectado — entrando…',
        cancelHostPrompt:
            'Si sales, se anulará la partida: el código ya no servirá. ¿Continuar?',
        cannotJoinOwn: 'Ya eres el anfitrión de esta partida.',
        joinCodeLabel: 'Código de la partida',
        joinCodePlaceholder: 'Pega el código recibido',
        joinSubmit: 'Unirse a la partida',
        invalidCode: 'Código no válido.',
        cancel: 'Volver',
    },
};

function withChrome(
    lang: SupportedLanguage,
    base: Omit<UiMessages, 'chrome' | 'targeting' | 'deckBuilder'>
): UiMessages {
    return {
        ...base,
        chrome: CHROME_MESSAGES[lang],
        targeting: TARGETING_MESSAGES[lang],
        deckBuilder: DECK_BUILDER_MESSAGES[lang],
    };
}

export const UI_MESSAGES: Record<SupportedLanguage, UiMessages> = {
    fr: withChrome('fr', fr),
    en: withChrome('en', en),
    de: withChrome('de', de),
    it: withChrome('it', it),
    es: withChrome('es', es),
};
