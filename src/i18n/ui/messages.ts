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
            personal: string;
            personalHint: string;
            avatar: string;
            avatarHint: string;
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
            hint: 'Données personnelles et listes — maquette pour l’instant.',
            personal: 'Données personnelles',
            personalHint: 'Pseudo, e-mail… — bientôt',
            avatar: 'Avatar',
            avatarHint: 'Choisir ou changer — bientôt',
            contacts: 'Contacts',
            contactsHint: 'Liste d’amis — bientôt',
            decks: 'Mes decks',
            decksHint: 'Gérer la liste de decks',
            soon: 'bientôt',
        },
        quit: 'Quitter le jeu',
        quitPrompt: 'Quitter ? (pas d’écran d’accueil pour l’instant)',
        cancel: 'Annuler',
        confirm: 'Confirmer',
    },
    dock: {
        hand: 'Main',
        sites: 'Sites',
        options: 'Options',
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
            hint: 'Personal data and lists — mock-up for now.',
            personal: 'Personal details',
            personalHint: 'Username, email… — coming soon',
            avatar: 'Avatar',
            avatarHint: 'Choose or change — coming soon',
            contacts: 'Contacts',
            contactsHint: 'Friends list — coming soon',
            decks: 'My decks',
            decksHint: 'Manage your deck list',
            soon: 'coming soon',
        },
        quit: 'Quit game',
        quitPrompt: 'Quit? (no home screen yet)',
        cancel: 'Cancel',
        confirm: 'Confirm',
    },
    dock: {
        hand: 'Hand',
        sites: 'Sites',
        options: 'Options',
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
            hint: 'Persönliche Daten und Listen — vorerst nur Entwurf.',
            personal: 'Persönliche Daten',
            personalHint: 'Benutzername, E-Mail… — demnächst',
            avatar: 'Avatar',
            avatarHint: 'Wählen oder ändern — demnächst',
            contacts: 'Kontakte',
            contactsHint: 'Freundesliste — demnächst',
            decks: 'Meine Decks',
            decksHint: 'Deckliste verwalten',
            soon: 'demnächst',
        },
        quit: 'Spiel beenden',
        quitPrompt: 'Beenden? (noch kein Startbildschirm)',
        cancel: 'Abbrechen',
        confirm: 'Bestätigen',
    },
    dock: {
        hand: 'Hand',
        sites: 'Orte',
        options: 'Optionen',
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
            hint: 'Dati personali e elenchi — bozza per ora.',
            personal: 'Dati personali',
            personalHint: 'Nome utente, e-mail… — presto',
            avatar: 'Avatar',
            avatarHint: 'Scegliere o cambiare — presto',
            contacts: 'Contatti',
            contactsHint: 'Lista amici — presto',
            decks: 'I miei mazzi',
            decksHint: 'Gestire l’elenco dei mazzi',
            soon: 'presto',
        },
        quit: 'Esci dal gioco',
        quitPrompt: 'Uscire? (nessuna schermata iniziale per ora)',
        cancel: 'Annulla',
        confirm: 'Conferma',
    },
    dock: {
        hand: 'Mano',
        sites: 'Siti',
        options: 'Opzioni',
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
            hint: 'Datos personales y listas — maqueta por ahora.',
            personal: 'Datos personales',
            personalHint: 'Usuario, correo… — pronto',
            avatar: 'Avatar',
            avatarHint: 'Elegir o cambiar — pronto',
            contacts: 'Contactos',
            contactsHint: 'Lista de amigos — pronto',
            decks: 'Mis mazos',
            decksHint: 'Gestionar la lista de mazos',
            soon: 'pronto',
        },
        quit: 'Salir del juego',
        quitPrompt: '¿Salir? (aún no hay pantalla de inicio)',
        cancel: 'Cancelar',
        confirm: 'Confirmar',
    },
    dock: {
        hand: 'Mano',
        sites: 'Sitios',
        options: 'Opciones',
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
