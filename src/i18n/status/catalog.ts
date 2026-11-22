import type { SupportedLanguage } from '../languages';
import type { StatusKey, StatusParams } from './types';

type Template = string | ((p: StatusParams) => string);

const fr: Record<StatusKey, Template> = {
    BIDDING_SETUP: 'Phase de mise en place : Misez vos points-fardeau.',
    SETUP_COMPLETE: 'Mise en place terminée ! Début de la partie.',
    MULLIGAN_PROMPT: 'Mulligan : garder ou piocher une nouvelle main.',
    MULLIGAN_WAITING: (p) =>
        `${p.name} ${p.didMulligan ? 'a fait un mulligan' : 'a gardé sa main'}. En attente de ${p.other}…`,
    BID_WAITING: (p) => `${p.name} a misé. En attente de ${p.other}…`,
    BID_REVEAL: (p) =>
        `${p.name0} (${p.bid0}) — ${p.name1} (${p.bid1}). ${p.winner} gagne l’enchère.`,
    FELLOWSHIP_PHASE: 'Phase de compagnie : Jouez vos compagnons et soutiens.',
    FELLOWSHIP_AFTER_SANCTUARY:
        'Sanctuaire : les compagnons blessés sont soignés.',
    SHADOW_PHASE_START: 'Début de la phase d’Ombre : Capacités spéciales.',
    SHADOW_PHASE_PLAY: (p) =>
        `Phase d’Ombre : Joueur Ombre (${p.shadowId}), jouez vos Séides/Soutiens. Crépuscule disponible : ${p.twilight}`,
    MANEUVER_START: 'Phase de Manœuvre : Capacités et effets de début de phase.',
    MANEUVER_ACTION_WINDOW: 'Manœuvre : Ouverture de la fenêtre d’action.',
    MANEUVER_DONE: 'Manœuvre terminée. Passage à la phase d’Archerie.',
    ARCHERY_START: 'Début de la phase d’archerie : Capacités spéciales.',
    ARCHERY_ACTION_WINDOW: 'Phase d’Archerie : Fenêtre d’action ouverte.',
    ARCHERY_FP_ASSIGN: (p) =>
        `Phase d’Archerie : ${p.name} doit attribuer ${p.count} blessure(s).`,
    ARCHERY_SHADOW_ASSIGN: (p) =>
        `Phase d’Archerie : ${p.name} doit attribuer ${p.count} blessure(s).`,
    ARCHERY_DONE: 'Phase d’Archerie terminée : Début de la phase d’Affectation.',
    ARCHERY_SKIPPED: 'Archerie ignorée (effet en jeu). Passage à la suite.',
    ARCHERY_NO_MINIONS:
        'Plus aucun séide en jeu après l’archerie : passage direct au Regroupement.',
    ASSIGNMENT_START: 'Début de la phase d’affectation : Capacités spéciales.',
    ASSIGNMENT_NO_COMPANIONS:
        'Aucun compagnon ne peut combattre. Les séides restants ne sont pas affectés.',
    SKIRMISH_START: 'Début de la phase de combat : Capacités spéciales.',
    THREAT_WOUNDS_FIRST:
        'Assignez d’abord les blessures de menaces avant de choisir un autre combat.',
    RESPONSE_OR_CHOICE_PENDING:
        'Une réponse ou un choix est en cours. Attendez la fin avant de choisir un autre combat.',
    LURKER_LOCKED:
        'Impossible de choisir un combat Lurker tant qu’il reste d’autres combats à résoudre !',
    START_OF_PHASE_DONE_WAITING: (p) =>
        `${p.name} a terminé ses actions de début de phase. En attente de ${p.other}…`,
    SHADOW_REFILL_HAND:
        'Ombre : Vous pouvez défausser 1 carte, puis validez votre main à 8 cartes.',
    REGROUP_START:
        'Phase de Regroupement : Étape initiale (Capacités).',
    REGROUP_ACTIONS:
        'Phase de Regroupement : Jouer des cartes/effets de regroupement.',
    OPTIONAL_EFFECT_AVAILABLE:
        'Vous pouvez activer l’effet optionnel de cette carte.',
    SITE_EFFECT_APPLIED: (p) => `${p.site || 'Le site'} : effet appliqué.`,
    PLAYED_CARD: (p) => `${p.player} a joué ${p.card}.`,
    WAITING_RESPONSE: (p) => `En attente de la réponse de ${p.name}…`,
    WAITING_SHADOW_SITE:
        "En attente du joueur de l'Ombre pour poser le prochain site...",
    TURN_TO_RESPOND: (p) =>
        `Au tour de ${p.name} de répondre ou de passer.`,
    FORCE_ASSIGN_PREVENTED: (p) =>
        `Les Peuples Libres empêchent l’affectation (${p.victim || 'compagnon'} défaussé).`,
    DESIGNATE_TRIGGERED_TARGET:
        'Désignez la cible de l’effet déclenché (jouer une carte).',
    REVEALED_UNDER_DECK: (p) =>
        `Main révélée : ${p.names} placée${Number(p.count) > 1 ? 's' : ''} sous la pioche.`,
    MOVE_TO_SITE: (p) =>
        `La compagnie avance au site ${p.siteNumber} : ${p.siteName} (${p.note} +${p.added} crépuscule → ${p.pool}).`,
    GENERIC: (p) => String(p.text ?? ''),
};

const en: Record<StatusKey, Template> = {
    BIDDING_SETUP: 'Setup phase: Bid your burdens.',
    SETUP_COMPLETE: 'Setup complete! The game begins.',
    MULLIGAN_PROMPT: 'Mulligan: keep your hand or draw a new one.',
    MULLIGAN_WAITING: (p) =>
        `${p.name} ${p.didMulligan ? 'mulliganed' : 'kept their hand'}. Waiting for ${p.other}…`,
    BID_WAITING: (p) => `${p.name} has bid. Waiting for ${p.other}…`,
    BID_REVEAL: (p) =>
        `${p.name0} (${p.bid0}) — ${p.name1} (${p.bid1}). ${p.winner} wins the bid.`,
    FELLOWSHIP_PHASE: 'Fellowship phase: Play companions and supports.',
    FELLOWSHIP_AFTER_SANCTUARY: 'Sanctuary: wounded companions are healed.',
    SHADOW_PHASE_START: 'Start of Shadow phase: Special abilities.',
    SHADOW_PHASE_PLAY: (p) =>
        `Shadow phase: Shadow player (${p.shadowId}), play Minions/Supports. Twilight available: ${p.twilight}`,
    MANEUVER_START: 'Maneuver phase: Start-of-phase abilities and effects.',
    MANEUVER_ACTION_WINDOW: 'Maneuver: Action window opens.',
    MANEUVER_DONE: 'Maneuver ended. Moving to Archery phase.',
    ARCHERY_START: 'Start of Archery phase: Special abilities.',
    ARCHERY_ACTION_WINDOW: 'Archery phase: Action window open.',
    ARCHERY_FP_ASSIGN: (p) =>
        `Archery phase: ${p.name} must assign ${p.count} wound(s).`,
    ARCHERY_SHADOW_ASSIGN: (p) =>
        `Archery phase: ${p.name} must assign ${p.count} wound(s).`,
    ARCHERY_DONE: 'Archery phase ended: Assignment phase begins.',
    ARCHERY_SKIPPED: 'Archery skipped (effect in play). Continuing.',
    ARCHERY_NO_MINIONS:
        'No minions left after archery: skipping to Regroup.',
    ASSIGNMENT_START: 'Start of Assignment phase: Special abilities.',
    ASSIGNMENT_NO_COMPANIONS:
        'No companion can skirmish. Remaining minions are unassigned.',
    SKIRMISH_START: 'Start of Skirmish phase: Special abilities.',
    THREAT_WOUNDS_FIRST:
        'Assign threat wounds first before choosing another skirmish.',
    RESPONSE_OR_CHOICE_PENDING:
        'A response or choice is pending. Wait before choosing another skirmish.',
    LURKER_LOCKED:
        'Cannot choose a Lurker skirmish while other skirmishes remain!',
    START_OF_PHASE_DONE_WAITING: (p) =>
        `${p.name} finished start-of-phase actions. Waiting for ${p.other}…`,
    SHADOW_REFILL_HAND:
        'Shadow: You may discard 1 card, then confirm your hand to 8 cards.',
    REGROUP_START: 'Regroup phase: Opening step (abilities).',
    REGROUP_ACTIONS: 'Regroup phase: Play regroup cards/effects.',
    OPTIONAL_EFFECT_AVAILABLE: 'You may activate this card’s optional effect.',
    SITE_EFFECT_APPLIED: (p) => `${p.site || 'The site'}: effect applied.`,
    PLAYED_CARD: (p) => `${p.player} played ${p.card}.`,
    WAITING_RESPONSE: (p) => `Waiting for ${p.name} to respond…`,
    WAITING_SHADOW_SITE: 'Waiting for the Shadow player to place the next site…',
    TURN_TO_RESPOND: (p) => `${p.name}’s turn to respond or pass.`,
    FORCE_ASSIGN_PREVENTED: (p) =>
        `Free Peoples prevent the assignment (${p.victim || 'companion'} discarded).`,
    DESIGNATE_TRIGGERED_TARGET:
        'Choose the target of the triggered effect (play a card).',
    REVEALED_UNDER_DECK: (p) =>
        `Hand revealed: ${p.names} placed under the draw deck.`,
    MOVE_TO_SITE: (p) =>
        `The fellowship moves to site ${p.siteNumber}: ${p.siteName} (${p.note} +${p.added} twilight → ${p.pool}).`,
    GENERIC: (p) => String(p.text ?? ''),
};

const de: Record<StatusKey, Template> = {
    BIDDING_SETUP: 'Vorbereitungsphase: Biete deine Lastmarken.',
    SETUP_COMPLETE: 'Vorbereitung abgeschlossen! Das Spiel beginnt.',
    MULLIGAN_PROMPT: 'Mulligan: Hand behalten oder neu ziehen.',
    MULLIGAN_WAITING: (p) =>
        `${p.name} ${p.didMulligan ? 'hat gemulligant' : 'hat die Hand behalten'}. Warte auf ${p.other}…`,
    BID_WAITING: (p) => `${p.name} hat geboten. Warte auf ${p.other}…`,
    BID_REVEAL: (p) =>
        `${p.name0} (${p.bid0}) — ${p.name1} (${p.bid1}). ${p.winner} gewinnt das Gebot.`,
    FELLOWSHIP_PHASE: 'Gemeinschaftsphase: Spiele Gefährten und Unterstützung.',
    FELLOWSHIP_AFTER_SANCTUARY: 'Zuflucht: Verwundete Gefährten werden geheilt.',
    SHADOW_PHASE_START: 'Beginn der Schattenphase: Spezielle Fähigkeiten.',
    SHADOW_PHASE_PLAY: (p) =>
        `Schattenphase: Schattenspieler (${p.shadowId}), spiele Diener/Unterstützung. Einfluss: ${p.twilight}`,
    MANEUVER_START: 'Manöverphase: Fähigkeiten und Effekte zu Phasenbeginn.',
    MANEUVER_ACTION_WINDOW: 'Manöver: Aktionsfenster öffnet sich.',
    MANEUVER_DONE: 'Manöver beendet. Weiter zur Fernkampfphase.',
    ARCHERY_START: 'Beginn der Fernkampfphase: Spezielle Fähigkeiten.',
    ARCHERY_ACTION_WINDOW: 'Fernkampfphase: Aktionsfenster geöffnet.',
    ARCHERY_FP_ASSIGN: (p) =>
        `Fernkampfphase: ${p.name} muss ${p.count} Wunde(n) zuweisen.`,
    ARCHERY_SHADOW_ASSIGN: (p) =>
        `Fernkampfphase: ${p.name} muss ${p.count} Wunde(n) zuweisen.`,
    ARCHERY_DONE: 'Fernkampf beendet: Zuweisungsphase beginnt.',
    ARCHERY_SKIPPED: 'Fernkampf übersprungen (Effekt im Spiel). Weiter.',
    ARCHERY_NO_MINIONS:
        'Keine Diener mehr nach dem Fernkampf: direkt zum Sammeln.',
    ASSIGNMENT_START: 'Beginn der Zuweisungsphase: Spezielle Fähigkeiten.',
    ASSIGNMENT_NO_COMPANIONS:
        'Kein Gefährte kann kämpfen. Verbleibende Diener werden nicht zugewiesen.',
    SKIRMISH_START: 'Beginn der Kampfphase: Spezielle Fähigkeiten.',
    THREAT_WOUNDS_FIRST:
        'Weise zuerst Bedrohungswunden zu, bevor du einen anderen Kampf wählst.',
    RESPONSE_OR_CHOICE_PENDING:
        'Eine Reaktion oder Wahl läuft. Warte, bevor du einen anderen Kampf wählst.',
    LURKER_LOCKED:
        'Kein Lurker-Kampf wählbar, solange andere Kämpfe offen sind!',
    START_OF_PHASE_DONE_WAITING: (p) =>
        `${p.name} hat Phasenbeginn beendet. Warte auf ${p.other}…`,
    SHADOW_REFILL_HAND:
        'Schatten: Du darfst 1 Karte ablegen, dann Hand auf 8 bestätigen.',
    REGROUP_START: 'Sammelphase: Eröffnungsschritt (Fähigkeiten).',
    REGROUP_ACTIONS: 'Sammelphase: Spiele Sammelkarten/-effekte.',
    OPTIONAL_EFFECT_AVAILABLE:
        'Du darfst den optionalen Effekt dieser Karte aktivieren.',
    SITE_EFFECT_APPLIED: (p) => `${p.site || 'Der Ort'}: Effekt angewandt.`,
    PLAYED_CARD: (p) => `${p.player} hat ${p.card} gespielt.`,
    WAITING_RESPONSE: (p) => `Warte auf Antwort von ${p.name}…`,
    WAITING_SHADOW_SITE:
        'Warte auf den Schattenspieler, der den nächsten Ort legt…',
    TURN_TO_RESPOND: (p) => `${p.name} ist am Zug zu reagieren oder zu passen.`,
    FORCE_ASSIGN_PREVENTED: (p) =>
        `Freie Völker verhindern die Zuweisung (${p.victim || 'Gefährte'} abgelegt).`,
    DESIGNATE_TRIGGERED_TARGET:
        'Wähle das Ziel des ausgelösten Effekts (Karte spielen).',
    REVEALED_UNDER_DECK: (p) =>
        `Hand aufgedeckt: ${p.names} unter den Nachziehstapel gelegt.`,
    MOVE_TO_SITE: (p) =>
        `Die Gemeinschaft zieht zum Ort ${p.siteNumber}: ${p.siteName} (${p.note} +${p.added} Einfluss → ${p.pool}).`,
    GENERIC: (p) => String(p.text ?? ''),
};

const it: Record<StatusKey, Template> = {
    BIDDING_SETUP: 'Fase di preparazione: Punta i tuoi fardelli.',
    SETUP_COMPLETE: 'Preparazione completata! Inizia la partita.',
    MULLIGAN_PROMPT: 'Mulligan: tieni la mano o pescane una nuova.',
    MULLIGAN_WAITING: (p) =>
        `${p.name} ${p.didMulligan ? 'ha fatto mulligan' : 'ha tenuto la mano'}. In attesa di ${p.other}…`,
    BID_WAITING: (p) => `${p.name} ha puntato. In attesa di ${p.other}…`,
    BID_REVEAL: (p) =>
        `${p.name0} (${p.bid0}) — ${p.name1} (${p.bid1}). ${p.winner} vince l’asta.`,
    FELLOWSHIP_PHASE: 'Fase Compagnia: Gioca compagni e supporti.',
    FELLOWSHIP_AFTER_SANCTUARY: 'Santuario: i compagni feriti sono curati.',
    SHADOW_PHASE_START: 'Inizio fase Ombra: Abilità speciali.',
    SHADOW_PHASE_PLAY: (p) =>
        `Fase Ombra: giocatore Ombra (${p.shadowId}), gioca Servitori/Supporti. Crepuscolo: ${p.twilight}`,
    MANEUVER_START: 'Fase di Manovra: Abilità ed effetti di inizio fase.',
    MANEUVER_ACTION_WINDOW: 'Manovra: Si apre la finestra d’azione.',
    MANEUVER_DONE: 'Manovra terminata. Si passa al Tiro.',
    ARCHERY_START: 'Inizio fase di Tiro: Abilità speciali.',
    ARCHERY_ACTION_WINDOW: 'Fase di Tiro: Finestra d’azione aperta.',
    ARCHERY_FP_ASSIGN: (p) =>
        `Fase di Tiro: ${p.name} deve assegnare ${p.count} ferita/e.`,
    ARCHERY_SHADOW_ASSIGN: (p) =>
        `Fase di Tiro: ${p.name} deve assegnare ${p.count} ferita/e.`,
    ARCHERY_DONE: 'Tiro terminato: Inizia l’Assegnazione.',
    ARCHERY_SKIPPED: 'Tiro ignorato (effetto in gioco). Si continua.',
    ARCHERY_NO_MINIONS:
        'Nessun servitore dopo il tiro: si passa al Raduno.',
    ASSIGNMENT_START: 'Inizio fase di Assegnazione: Abilità speciali.',
    ASSIGNMENT_NO_COMPANIONS:
        'Nessun compagno può combattere. I servitori restanti non sono assegnati.',
    SKIRMISH_START: 'Inizio fase di Schermaglia: Abilità speciali.',
    THREAT_WOUNDS_FIRST:
        'Assegna prima le ferite da minaccia prima di scegliere un altro combattimento.',
    RESPONSE_OR_CHOICE_PENDING:
        'Una risposta o una scelta è in corso. Attendi prima di sceglierne un altro.',
    LURKER_LOCKED:
        'Non puoi scegliere un combattimento Lurker finché ne restano altri!',
    START_OF_PHASE_DONE_WAITING: (p) =>
        `${p.name} ha finito le azioni di inizio fase. In attesa di ${p.other}…`,
    SHADOW_REFILL_HAND:
        'Ombra: Puoi scartare 1 carta, poi conferma la mano a 8 carte.',
    REGROUP_START: 'Fase di Raduno: Passo iniziale (Abilità).',
    REGROUP_ACTIONS: 'Fase di Raduno: Gioca carte/effetti di raduno.',
    OPTIONAL_EFFECT_AVAILABLE:
        'Puoi attivare l’effetto opzionale di questa carta.',
    SITE_EFFECT_APPLIED: (p) => `${p.site || 'Il sito'}: effetto applicato.`,
    PLAYED_CARD: (p) => `${p.player} ha giocato ${p.card}.`,
    WAITING_RESPONSE: (p) => `In attesa della risposta di ${p.name}…`,
    WAITING_SHADOW_SITE:
        'In attesa del giocatore Ombra per piazzare il prossimo sito…',
    TURN_TO_RESPOND: (p) => `Tocca a ${p.name} rispondere o passare.`,
    FORCE_ASSIGN_PREVENTED: (p) =>
        `I Popoli Liberi impediscono l’assegnazione (${p.victim || 'compagno'} scartato).`,
    DESIGNATE_TRIGGERED_TARGET:
        'Scegli il bersaglio dell’effetto attivato (giocare una carta).',
    REVEALED_UNDER_DECK: (p) =>
        `Mano rivelata: ${p.names} messa${Number(p.count) > 1 ? 'e' : ''} sotto il mazzo.`,
    MOVE_TO_SITE: (p) =>
        `La Compagnia avanza al sito ${p.siteNumber}: ${p.siteName} (${p.note} +${p.added} crepuscolo → ${p.pool}).`,
    GENERIC: (p) => String(p.text ?? ''),
};

const es: Record<StatusKey, Template> = {
    BIDDING_SETUP: 'Fase de preparación: Puja tus cargas.',
    SETUP_COMPLETE: '¡Preparación terminada! Empieza la partida.',
    MULLIGAN_PROMPT: 'Mulligan: conserva tu mano o roba una nueva.',
    MULLIGAN_WAITING: (p) =>
        `${p.name} ${p.didMulligan ? 'hizo mulligan' : 'conservó su mano'}. Esperando a ${p.other}…`,
    BID_WAITING: (p) => `${p.name} ha pujado. Esperando a ${p.other}…`,
    BID_REVEAL: (p) =>
        `${p.name0} (${p.bid0}) — ${p.name1} (${p.bid1}). ${p.winner} gana la puja.`,
    FELLOWSHIP_PHASE: 'Fase de Compañía: Juega compañeros y apoyos.',
    FELLOWSHIP_AFTER_SANCTUARY: 'Santuario: los compañeros heridos se curan.',
    SHADOW_PHASE_START: 'Inicio de la fase de Sombra: Habilidades especiales.',
    SHADOW_PHASE_PLAY: (p) =>
        `Fase de Sombra: jugador Sombra (${p.shadowId}), juega Esbirros/Apoyos. Crepúsculo: ${p.twilight}`,
    MANEUVER_START: 'Fase de Maniobra: Habilidades y efectos de inicio de fase.',
    MANEUVER_ACTION_WINDOW: 'Maniobra: Se abre la ventana de acción.',
    MANEUVER_DONE: 'Maniobra terminada. Paso a Arquería.',
    ARCHERY_START: 'Inicio de la fase de Arquería: Habilidades especiales.',
    ARCHERY_ACTION_WINDOW: 'Fase de Arquería: Ventana de acción abierta.',
    ARCHERY_FP_ASSIGN: (p) =>
        `Fase de Arquería: ${p.name} debe asignar ${p.count} herida(s).`,
    ARCHERY_SHADOW_ASSIGN: (p) =>
        `Fase de Arquería: ${p.name} debe asignar ${p.count} herida(s).`,
    ARCHERY_DONE: 'Arquería terminada: Empieza la Asignación.',
    ARCHERY_SKIPPED: 'Arquería ignorada (efecto en juego). Se continúa.',
    ARCHERY_NO_MINIONS:
        'No quedan esbirros tras la arquería: paso directo a Reagrupación.',
    ASSIGNMENT_START: 'Inicio de la fase de Asignación: Habilidades especiales.',
    ASSIGNMENT_NO_COMPANIONS:
        'Ningún compañero puede combatir. Los esbirros restantes no se asignan.',
    SKIRMISH_START: 'Inicio de la fase de Escaramuza: Habilidades especiales.',
    THREAT_WOUNDS_FIRST:
        'Asigna primero las heridas de amenazas antes de elegir otro combate.',
    RESPONSE_OR_CHOICE_PENDING:
        'Hay una respuesta o elección en curso. Espera antes de elegir otro combate.',
    LURKER_LOCKED:
        '¡No puedes elegir un combate Lurker mientras queden otros!',
    START_OF_PHASE_DONE_WAITING: (p) =>
        `${p.name} terminó las acciones de inicio de fase. Esperando a ${p.other}…`,
    SHADOW_REFILL_HAND:
        'Sombra: Puedes descartar 1 carta, luego valida tu mano a 8 cartas.',
    REGROUP_START: 'Fase de Reagrupación: Paso inicial (Habilidades).',
    REGROUP_ACTIONS: 'Fase de Reagrupación: Juega cartas/efectos de reagrupación.',
    OPTIONAL_EFFECT_AVAILABLE:
        'Puedes activar el efecto opcional de esta carta.',
    SITE_EFFECT_APPLIED: (p) => `${p.site || 'El sitio'}: efecto aplicado.`,
    PLAYED_CARD: (p) => `${p.player} jugó ${p.card}.`,
    WAITING_RESPONSE: (p) => `Esperando la respuesta de ${p.name}…`,
    WAITING_SHADOW_SITE:
        'Esperando al jugador Sombra para colocar el siguiente sitio…',
    TURN_TO_RESPOND: (p) => `Le toca a ${p.name} responder o pasar.`,
    FORCE_ASSIGN_PREVENTED: (p) =>
        `Los Pueblos Libres impiden la asignación (${p.victim || 'compañero'} descartado).`,
    DESIGNATE_TRIGGERED_TARGET:
        'Elige el objetivo del efecto disparado (jugar una carta).',
    REVEALED_UNDER_DECK: (p) =>
        `Mano revelada: ${p.names} puesta${Number(p.count) > 1 ? 's' : ''} bajo el mazo.`,
    MOVE_TO_SITE: (p) =>
        `La comunidad avanza al sitio ${p.siteNumber}: ${p.siteName} (${p.note} +${p.added} crepúsculo → ${p.pool}).`,
    GENERIC: (p) => String(p.text ?? ''),
};

export const STATUS_CATALOG: Record<
    SupportedLanguage,
    Record<StatusKey, Template>
> = { fr, en, de, it, es };
