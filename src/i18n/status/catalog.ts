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
    ASSIGNMENT_ACTION_WINDOW: 'Affectation : Ouverture de la fenêtre d’action.',
    ASSIGNMENT_NO_FIERCE: 'Aucun séide Acharné (FIERCE) à assigner.',
    ASSIGNMENT_NO_MINIONS: 'Aucun séide en jeu : pas d’affectation nécessaire.',
    ASSIGNMENT_FP_ASSIGN:
        'Phase d’Affectation : Le joueur des Peuples Libres attribue les séides aux compagnons.',
    ASSIGNMENT_FIERCE_ASSIGN:
        'Phase d’Affectation Acharnée : Assignez les séides FIERCE.',
    ASSIGNMENT_SHADOW_OVERLOAD:
        "Surcharge ! L'Ombre affecte les séides restants à son choix.",
    ASSIGNMENT_YIELD_TO_SHADOW:
        'Les Peuples Libres laissent l’Ombre affecter les séides restants.',
    ASSIGNMENT_DONE_START_SKIRMISH:
        'Toutes les affectations sont terminées. Début des combats !',
    ASSIGNMENT_SHADOW_LEFT: (p) =>
        `L’Ombre laisse ${p.count} séide${Number(p.count) > 1 ? 's' : ''} hors combat. Début des combats !`,
    ASSIGNED: (p) => `${p.minion} est assigné à ${p.companion}.`,
    ASSIGNED_AMBUSH: (p) =>
        `${p.minion} est assigné à ${p.companion}. Embuscade : +${p.twilight} Crépuscule.`,
    ASSIGNED_STRENGTH_BONUS: (p) =>
        `${p.minion} est assigné à ${p.companion} (force +${p.bonus} jusqu’au regroupement).`,
    SKIRMISH_ENDED_DISCARD:
        'Escarmouche terminée : un combattant a quitté le combat (défausse). Pas de vainqueur.',
    SKIRMISH_ENDED_FP_WIN:
        'Escarmouche terminée : plus de séide en face — victoire des Peuples Libres.',
    SKIRMISH_ENDED_SHADOW_WIN:
        'Escarmouche terminée : le compagnon est mort — victoire de l’Ombre.',
    SKIRMISH_ENDED_EMPTY: 'Escarmouche terminée : plus de combattants.',
    SKIRMISH_CANCELLED: (p) => `Combat annulé (${p.card}).`,
    ARCHERY_TO_SHADOW_ASSIGN:
        'Passage à l’assignation des blessures d’Ombre.',
    ARCHERY_FP_REMAINING: (p) =>
        `Assignation d'archerie FP : ${p.count} restante(s).`,
    ARCHERY_SHADOW_REMAINING: (p) =>
        `Ombre : Assignez encore ${p.count} blessure(s).`,
    ARCHERY_ALL_MINIONS_DEAD:
        'Tous les séides ont été éliminés ! Passage au Regroupement.',
    SANCTUARY_HEAL_PROMPT:
        'Sanctuaire : soignez jusqu’à 5 blessures sur vos compagnons.',
    SANCTUARY_HEAL_REMAINING: (p) =>
        `Sanctuaire : encore ${p.count} soin(s) possible(s).`,
    THREAT_WOUNDS_REMAINING: (p) =>
        `Menaces : encore ${p.count} blessure(s) à assigner.`,
    THREAT_WOUNDS_DONE: 'Blessures de menaces assignées.',
    THREAT_WOUNDS_LOST:
        'Plus de compagnon à blesser. Blessures de menaces restantes perdues.',
    REGROUP_FP_REFILL:
        'Peuples Libres : Ajustez votre main à 8 cartes et validez pour terminer le tour.',
    REGROUP_ALREADY_DISCARDED:
        'Vous avez déjà défaussé votre carte optionnelle pour ce tour.',
    DISCARDED_CARD: (p) => `${p.player} a défaussé ${p.card}.`,
    REGROUP_MOVE_BLOCKED:
        'Déplacement supplémentaire empêché (site). Reconstitution de la main des Peuples Libres.',
    REGROUP_MOVE_LIMIT: (p) =>
        `Limite de déplacement atteinte (${p.limit}/${p.limit}). Reconstitution de la main des Peuples Libres.`,
    REGROUP_FP_DECISION:
        "Peuples Libres : Choisissez d'avancer au site suivant ou de terminer le tour.",
    SITE_WOUNDS_FP: (p) =>
        `Site : Peuples Libres, assignez ${p.count} blessure(s) à vos personnages.`,
    SITE_WOUNDS_FP_ALLIES: (p) =>
        `Site : Peuples Libres, assignez ${p.count} blessure(s) à vos compagnons (une par allié).`,
    SITE_WOUNDS_SHADOW: (p) =>
        `Site : Ombre, assignez ${p.count} blessure(s) à vos séides.`,
    SITE_WOUNDS_REMAINING: (p) =>
        `Site : encore ${p.count} blessure(s) à assigner.`,
    SITE_WOUNDS_FP_NEXT: (p) =>
        `Site : Peuples Libres, assignez ${p.count} blessure(s).`,
    MUSTER_DISCARDED: (p) =>
        `${p.player} a défaussé ${p.card} (ralliement ${p.discarded}/${p.allowed}).`,
    MUSTER_WAITING: (p) =>
        `${p.player} a validé son ralliement. En attente de ${p.other}…`,
    GAME_WON: (p) => {
        const name = String(p.ringBearer || 'Le Porteur');
        const female = Boolean(p.female);
        const detail =
            p.reason === 'SITE_NINE'
                ? female
                    ? `${name}, aidée de ses compagnons, a détruit l’Anneau de Sauron.`
                    : `${name}, aidé de ses compagnons, a détruit l’Anneau de Sauron.`
                : p.reason === 'CORRUPTION'
                  ? female
                      ? `${name} a été corrompue par la volonté de l’Anneau.`
                      : `${name} a été corrompu par la volonté de l’Anneau.`
                  : `${name} a succombé à ses blessures.`;
        return `${p.player} remporte la partie. ${detail}`;
    },
    PLAYED_FROM_DISCARD: (p) => `${p.card} est joué depuis la défausse.`,
    PLAYED_FROM_DISCARD_UNDER: (p) =>
        `${p.card} est joué depuis la défausse, puis placé sous la pioche.`,
    PLAYED_FROM_DISCARD_ATTACHED: (p) =>
        `${p.card} est joué depuis la défausse et attaché à ${p.host}.`,
    PLAYED_FROM_DISCARD_BATTLEFIELD: (p) =>
        `${p.card} entre sur le champ de bataille depuis la défausse.`,
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
    ASSIGNMENT_ACTION_WINDOW: 'Assignment: Action window opens.',
    ASSIGNMENT_NO_FIERCE: 'No Fierce minions to assign.',
    ASSIGNMENT_NO_MINIONS: 'No minions in play: no assignment needed.',
    ASSIGNMENT_FP_ASSIGN:
        'Assignment phase: Free Peoples player assigns minions to companions.',
    ASSIGNMENT_FIERCE_ASSIGN:
        'Fierce Assignment: Assign FIERCE minions.',
    ASSIGNMENT_SHADOW_OVERLOAD:
        'Overloaded! Shadow assigns the remaining minions.',
    ASSIGNMENT_YIELD_TO_SHADOW:
        'Free Peoples let Shadow assign the remaining minions.',
    ASSIGNMENT_DONE_START_SKIRMISH:
        'All assignments complete. Skirmishes begin!',
    ASSIGNMENT_SHADOW_LEFT: (p) =>
        `Shadow leaves ${p.count} minion${Number(p.count) > 1 ? 's' : ''} out of combat. Skirmishes begin!`,
    ASSIGNED: (p) => `${p.minion} is assigned to ${p.companion}.`,
    ASSIGNED_AMBUSH: (p) =>
        `${p.minion} is assigned to ${p.companion}. Ambush: +${p.twilight} Twilight.`,
    ASSIGNED_STRENGTH_BONUS: (p) =>
        `${p.minion} is assigned to ${p.companion} (strength +${p.bonus} until regroup).`,
    SKIRMISH_ENDED_DISCARD:
        'Skirmish ended: a fighter left combat (discard). No winner.',
    SKIRMISH_ENDED_FP_WIN:
        'Skirmish ended: no minion left — Free Peoples win.',
    SKIRMISH_ENDED_SHADOW_WIN:
        'Skirmish ended: the companion died — Shadow wins.',
    SKIRMISH_ENDED_EMPTY: 'Skirmish ended: no fighters left.',
    SKIRMISH_CANCELLED: (p) => `Skirmish cancelled (${p.card}).`,
    ARCHERY_TO_SHADOW_ASSIGN: 'Moving to Shadow archery wound assignment.',
    ARCHERY_FP_REMAINING: (p) =>
        `FP archery assignment: ${p.count} remaining.`,
    ARCHERY_SHADOW_REMAINING: (p) =>
        `Shadow: Assign ${p.count} more wound(s).`,
    ARCHERY_ALL_MINIONS_DEAD:
        'All minions eliminated! Moving to Regroup.',
    SANCTUARY_HEAL_PROMPT:
        'Sanctuary: heal up to 5 wounds on your companions.',
    SANCTUARY_HEAL_REMAINING: (p) =>
        `Sanctuary: ${p.count} heal(s) still available.`,
    THREAT_WOUNDS_REMAINING: (p) =>
        `Threats: ${p.count} wound(s) still to assign.`,
    THREAT_WOUNDS_DONE: 'Threat wounds assigned.',
    THREAT_WOUNDS_LOST:
        'No companion left to wound. Remaining threat wounds are lost.',
    REGROUP_FP_REFILL:
        'Free Peoples: Adjust your hand to 8 cards and confirm to end the turn.',
    REGROUP_ALREADY_DISCARDED:
        'You already discarded your optional card this turn.',
    DISCARDED_CARD: (p) => `${p.player} discarded ${p.card}.`,
    REGROUP_MOVE_BLOCKED:
        'Extra move prevented (site). Free Peoples refill their hand.',
    REGROUP_MOVE_LIMIT: (p) =>
        `Move limit reached (${p.limit}/${p.limit}). Free Peoples refill their hand.`,
    REGROUP_FP_DECISION:
        'Free Peoples: Choose to move to the next site or end the turn.',
    SITE_WOUNDS_FP: (p) =>
        `Site: Free Peoples, assign ${p.count} wound(s) to your characters.`,
    SITE_WOUNDS_FP_ALLIES: (p) =>
        `Site: Free Peoples, assign ${p.count} wound(s) to your companions (one per ally).`,
    SITE_WOUNDS_SHADOW: (p) =>
        `Site: Shadow, assign ${p.count} wound(s) to your minions.`,
    SITE_WOUNDS_REMAINING: (p) =>
        `Site: ${p.count} wound(s) still to assign.`,
    SITE_WOUNDS_FP_NEXT: (p) =>
        `Site: Free Peoples, assign ${p.count} wound(s).`,
    MUSTER_DISCARDED: (p) =>
        `${p.player} discarded ${p.card} (muster ${p.discarded}/${p.allowed}).`,
    MUSTER_WAITING: (p) =>
        `${p.player} confirmed muster. Waiting for ${p.other}…`,
    GAME_WON: (p) => {
        const name = String(p.ringBearer || 'The Ring-bearer');
        const female = Boolean(p.female);
        const detail =
            p.reason === 'SITE_NINE'
                ? `${name}, aided by companions, destroyed Sauron’s Ring.`
                : p.reason === 'CORRUPTION'
                  ? female
                      ? `${name} was corrupted by the will of the Ring.`
                      : `${name} was corrupted by the will of the Ring.`
                  : `${name} succumbed to wounds.`;
        return `${p.player} wins the game. ${detail}`;
    },
    PLAYED_FROM_DISCARD: (p) => `${p.card} is played from the discard pile.`,
    PLAYED_FROM_DISCARD_UNDER: (p) =>
        `${p.card} is played from the discard pile, then placed under the draw deck.`,
    PLAYED_FROM_DISCARD_ATTACHED: (p) =>
        `${p.card} is played from the discard pile and attached to ${p.host}.`,
    PLAYED_FROM_DISCARD_BATTLEFIELD: (p) =>
        `${p.card} enters the battlefield from the discard pile.`,
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
    ASSIGNMENT_ACTION_WINDOW: 'Zuweisung: Aktionsfenster öffnet sich.',
    ASSIGNMENT_NO_FIERCE: 'Keine Erbitterten Diener zuzuweisen.',
    ASSIGNMENT_NO_MINIONS: 'Keine Diener im Spiel: keine Zuweisung nötig.',
    ASSIGNMENT_FP_ASSIGN:
        'Zuweisungsphase: Freie Völker weisen Diener den Gefährten zu.',
    ASSIGNMENT_FIERCE_ASSIGN:
        'Erbitterte Zuweisung: Weise FIERCE-Diener zu.',
    ASSIGNMENT_SHADOW_OVERLOAD:
        'Überlastung! Der Schatten weist die restlichen Diener zu.',
    ASSIGNMENT_YIELD_TO_SHADOW:
        'Freie Völker lassen den Schatten die restlichen Diener zuweisen.',
    ASSIGNMENT_DONE_START_SKIRMISH:
        'Alle Zuweisungen abgeschlossen. Kämpfe beginnen!',
    ASSIGNMENT_SHADOW_LEFT: (p) =>
        `Schatten lässt ${p.count} Diener außerhalb des Kampfes. Kämpfe beginnen!`,
    ASSIGNED: (p) => `${p.minion} wird ${p.companion} zugewiesen.`,
    ASSIGNED_AMBUSH: (p) =>
        `${p.minion} wird ${p.companion} zugewiesen. Hinterhalt: +${p.twilight} Einfluss.`,
    ASSIGNED_STRENGTH_BONUS: (p) =>
        `${p.minion} wird ${p.companion} zugewiesen (Stärke +${p.bonus} bis zum Sammeln).`,
    SKIRMISH_ENDED_DISCARD:
        'Kampf beendet: ein Kämpfer hat den Kampf verlassen (Ablage). Kein Sieger.',
    SKIRMISH_ENDED_FP_WIN:
        'Kampf beendet: kein Diener mehr — Freie Völker siegen.',
    SKIRMISH_ENDED_SHADOW_WIN:
        'Kampf beendet: der Gefährte ist tot — Schatten siegt.',
    SKIRMISH_ENDED_EMPTY: 'Kampf beendet: keine Kämpfer mehr.',
    SKIRMISH_CANCELLED: (p) => `Kampf abgebrochen (${p.card}).`,
    ARCHERY_TO_SHADOW_ASSIGN:
        'Weiter zur Zuweisung der Schattenwunden.',
    ARCHERY_FP_REMAINING: (p) =>
        `FP-Fernkampfzuweisung: noch ${p.count}.`,
    ARCHERY_SHADOW_REMAINING: (p) =>
        `Schatten: Weise noch ${p.count} Wunde(n) zu.`,
    ARCHERY_ALL_MINIONS_DEAD:
        'Alle Diener eliminiert! Weiter zum Sammeln.',
    SANCTUARY_HEAL_PROMPT:
        'Zuflucht: heile bis zu 5 Wunden bei deinen Gefährten.',
    SANCTUARY_HEAL_REMAINING: (p) =>
        `Zuflucht: noch ${p.count} Heilung(en) möglich.`,
    THREAT_WOUNDS_REMAINING: (p) =>
        `Bedrohungen: noch ${p.count} Wunde(n) zuzuweisen.`,
    THREAT_WOUNDS_DONE: 'Bedrohungswunden zugewiesen.',
    THREAT_WOUNDS_LOST:
        'Kein Gefährte mehr zu verwunden. Verbleibende Bedrohungswunden verfallen.',
    REGROUP_FP_REFILL:
        'Freie Völker: Passe deine Hand auf 8 Karten an und bestätige, um den Zug zu beenden.',
    REGROUP_ALREADY_DISCARDED:
        'Du hast deine optionale Karte in diesem Zug bereits abgelegt.',
    DISCARDED_CARD: (p) => `${p.player} hat ${p.card} abgelegt.`,
    REGROUP_MOVE_BLOCKED:
        'Zusätzlicher Zug verhindert (Ort). Freie Völker füllen die Hand auf.',
    REGROUP_MOVE_LIMIT: (p) =>
        `Zuglimit erreicht (${p.limit}/${p.limit}). Freie Völker füllen die Hand auf.`,
    REGROUP_FP_DECISION:
        'Freie Völker: Wähle, zum nächsten Ort zu ziehen oder den Zug zu beenden.',
    SITE_WOUNDS_FP: (p) =>
        `Ort: Freie Völker, weise ${p.count} Wunde(n) deinen Charakteren zu.`,
    SITE_WOUNDS_FP_ALLIES: (p) =>
        `Ort: Freie Völker, weise ${p.count} Wunde(n) deinen Gefährten zu (eine pro Verbündeten).`,
    SITE_WOUNDS_SHADOW: (p) =>
        `Ort: Schatten, weise ${p.count} Wunde(n) deinen Dienern zu.`,
    SITE_WOUNDS_REMAINING: (p) =>
        `Ort: noch ${p.count} Wunde(n) zuzuweisen.`,
    SITE_WOUNDS_FP_NEXT: (p) =>
        `Ort: Freie Völker, weise ${p.count} Wunde(n) zu.`,
    MUSTER_DISCARDED: (p) =>
        `${p.player} hat ${p.card} abgelegt (Muster ${p.discarded}/${p.allowed}).`,
    MUSTER_WAITING: (p) =>
        `${p.player} hat das Muster bestätigt. Warte auf ${p.other}…`,
    GAME_WON: (p) => {
        const name = String(p.ringBearer || 'Der Ringträger');
        const female = Boolean(p.female);
        const detail =
            p.reason === 'SITE_NINE'
                ? `${name} hat mit den Gefährten den Ring Saurons zerstört.`
                : p.reason === 'CORRUPTION'
                  ? female
                      ? `${name} wurde durch den Willen des Rings verdorben.`
                      : `${name} wurde durch den Willen des Rings verdorben.`
                  : `${name} erlag den Wunden.`;
        return `${p.player} gewinnt die Partie. ${detail}`;
    },
    PLAYED_FROM_DISCARD: (p) => `${p.card} wird aus dem Ablagestapel gespielt.`,
    PLAYED_FROM_DISCARD_UNDER: (p) =>
        `${p.card} wird aus dem Ablagestapel gespielt und unter den Nachziehstapel gelegt.`,
    PLAYED_FROM_DISCARD_ATTACHED: (p) =>
        `${p.card} wird aus dem Ablagestapel gespielt und an ${p.host} angelegt.`,
    PLAYED_FROM_DISCARD_BATTLEFIELD: (p) =>
        `${p.card} betritt das Schlachtfeld aus dem Ablagestapel.`,
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
    ASSIGNMENT_ACTION_WINDOW: 'Assegnazione: Si apre la finestra d’azione.',
    ASSIGNMENT_NO_FIERCE: 'Nessun servitore Accanito (FIERCE) da assegnare.',
    ASSIGNMENT_NO_MINIONS: 'Nessun servitore in gioco: nessuna assegnazione.',
    ASSIGNMENT_FP_ASSIGN:
        'Fase di Assegnazione: i Popoli Liberi assegnano i servitori ai compagni.',
    ASSIGNMENT_FIERCE_ASSIGN:
        'Assegnazione Accanita: Assegna i servitori FIERCE.',
    ASSIGNMENT_SHADOW_OVERLOAD:
        'Sovraccarico! L’Ombra assegna i servitori restanti.',
    ASSIGNMENT_YIELD_TO_SHADOW:
        'I Popoli Liberi lasciano all’Ombra assegnare i servitori restanti.',
    ASSIGNMENT_DONE_START_SKIRMISH:
        'Assegnazioni terminate. Iniziano i combattimenti!',
    ASSIGNMENT_SHADOW_LEFT: (p) =>
        `L’Ombra lascia ${p.count} servitor${Number(p.count) > 1 ? 'i' : 'e'} fuori dal combattimento. Iniziano i combattimenti!`,
    ASSIGNED: (p) => `${p.minion} è assegnato a ${p.companion}.`,
    ASSIGNED_AMBUSH: (p) =>
        `${p.minion} è assegnato a ${p.companion}. Imboscata: +${p.twilight} Crepuscolo.`,
    ASSIGNED_STRENGTH_BONUS: (p) =>
        `${p.minion} è assegnato a ${p.companion} (forza +${p.bonus} fino al raduno).`,
    SKIRMISH_ENDED_DISCARD:
        'Schermaglia terminata: un combattente ha lasciato il combattimento (scarto). Nessun vincitore.',
    SKIRMISH_ENDED_FP_WIN:
        'Schermaglia terminata: nessun servitore — vincono i Popoli Liberi.',
    SKIRMISH_ENDED_SHADOW_WIN:
        'Schermaglia terminata: il compagno è morto — vince l’Ombra.',
    SKIRMISH_ENDED_EMPTY: 'Schermaglia terminata: nessun combattente.',
    SKIRMISH_CANCELLED: (p) => `Combattimento annullato (${p.card}).`,
    ARCHERY_TO_SHADOW_ASSIGN:
        'Passaggio all’assegnazione delle ferite dell’Ombra.',
    ARCHERY_FP_REMAINING: (p) =>
        `Assegnazione tiro PL: ${p.count} rimanente/i.`,
    ARCHERY_SHADOW_REMAINING: (p) =>
        `Ombra: Assegna ancora ${p.count} ferita/e.`,
    ARCHERY_ALL_MINIONS_DEAD:
        'Tutti i servitori eliminati! Si passa al Raduno.',
    SANCTUARY_HEAL_PROMPT:
        'Santuario: cura fino a 5 ferite sui tuoi compagni.',
    SANCTUARY_HEAL_REMAINING: (p) =>
        `Santuario: ancora ${p.count} cura/e disponibili.`,
    THREAT_WOUNDS_REMAINING: (p) =>
        `Minacce: ancora ${p.count} ferita/e da assegnare.`,
    THREAT_WOUNDS_DONE: 'Ferite da minaccia assegnate.',
    THREAT_WOUNDS_LOST:
        'Nessun compagno da ferire. Ferite da minaccia restanti perse.',
    REGROUP_FP_REFILL:
        'Popoli Liberi: Adatta la mano a 8 carte e conferma per terminare il turno.',
    REGROUP_ALREADY_DISCARDED:
        'Hai già scartato la carta opzionale per questo turno.',
    DISCARDED_CARD: (p) => `${p.player} ha scartato ${p.card}.`,
    REGROUP_MOVE_BLOCKED:
        'Spostamento extra impedito (sito). I Popoli Liberi ricostituiscono la mano.',
    REGROUP_MOVE_LIMIT: (p) =>
        `Limite di spostamento raggiunto (${p.limit}/${p.limit}). I Popoli Liberi ricostituiscono la mano.`,
    REGROUP_FP_DECISION:
        'Popoli Liberi: Scegliete di avanzare al sito successivo o terminare il turno.',
    SITE_WOUNDS_FP: (p) =>
        `Sito: Popoli Liberi, assegnate ${p.count} ferita/e ai vostri personaggi.`,
    SITE_WOUNDS_FP_ALLIES: (p) =>
        `Sito: Popoli Liberi, assegnate ${p.count} ferita/e ai compagni (una per alleato).`,
    SITE_WOUNDS_SHADOW: (p) =>
        `Sito: Ombra, assegnate ${p.count} ferita/e ai vostri servitori.`,
    SITE_WOUNDS_REMAINING: (p) =>
        `Sito: ancora ${p.count} ferita/e da assegnare.`,
    SITE_WOUNDS_FP_NEXT: (p) =>
        `Sito: Popoli Liberi, assegnate ${p.count} ferita/e.`,
    MUSTER_DISCARDED: (p) =>
        `${p.player} ha scartato ${p.card} (raduno ${p.discarded}/${p.allowed}).`,
    MUSTER_WAITING: (p) =>
        `${p.player} ha confermato il raduno. In attesa di ${p.other}…`,
    GAME_WON: (p) => {
        const name = String(p.ringBearer || 'Il Portatore');
        const female = Boolean(p.female);
        const detail =
            p.reason === 'SITE_NINE'
                ? `${name}, con i compagni, ha distrutto l’Anello di Sauron.`
                : p.reason === 'CORRUPTION'
                  ? female
                      ? `${name} è stata corrotta dalla volontà dell’Anello.`
                      : `${name} è stato corrotto dalla volontà dell’Anello.`
                  : `${name} è soccombuto alle ferite.`;
        return `${p.player} vince la partita. ${detail}`;
    },
    PLAYED_FROM_DISCARD: (p) => `${p.card} è giocato dalla pila degli scarti.`,
    PLAYED_FROM_DISCARD_UNDER: (p) =>
        `${p.card} è giocato dalla pila degli scarti, poi messo sotto il mazzo.`,
    PLAYED_FROM_DISCARD_ATTACHED: (p) =>
        `${p.card} è giocato dalla pila degli scarti e attaccato a ${p.host}.`,
    PLAYED_FROM_DISCARD_BATTLEFIELD: (p) =>
        `${p.card} entra in campo dalla pila degli scarti.`,
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
    ASSIGNMENT_ACTION_WINDOW: 'Asignación: Se abre la ventana de acción.',
    ASSIGNMENT_NO_FIERCE: 'No hay esbirros Enardecidos (FIERCE) que asignar.',
    ASSIGNMENT_NO_MINIONS: 'No hay esbirros en juego: no hace falta asignar.',
    ASSIGNMENT_FP_ASSIGN:
        'Fase de Asignación: Los Pueblos Libres asignan esbirros a compañeros.',
    ASSIGNMENT_FIERCE_ASSIGN:
        'Asignación Enardecida: Asigna esbirros FIERCE.',
    ASSIGNMENT_SHADOW_OVERLOAD:
        '¡Sobrecarga! La Sombra asigna los esbirros restantes.',
    ASSIGNMENT_YIELD_TO_SHADOW:
        'Los Pueblos Libres dejan que la Sombra asigne los esbirros restantes.',
    ASSIGNMENT_DONE_START_SKIRMISH:
        'Asignaciones terminadas. ¡Empiezan los combates!',
    ASSIGNMENT_SHADOW_LEFT: (p) =>
        `La Sombra deja ${p.count} esbirro${Number(p.count) > 1 ? 's' : ''} fuera de combate. ¡Empiezan los combates!`,
    ASSIGNED: (p) => `${p.minion} se asigna a ${p.companion}.`,
    ASSIGNED_AMBUSH: (p) =>
        `${p.minion} se asigna a ${p.companion}. Emboscada: +${p.twilight} Crepúsculo.`,
    ASSIGNED_STRENGTH_BONUS: (p) =>
        `${p.minion} se asigna a ${p.companion} (fuerza +${p.bonus} hasta la reagrupación).`,
    SKIRMISH_ENDED_DISCARD:
        'Escaramuza terminada: un combatiente dejó el combate (descarte). Sin vencedor.',
    SKIRMISH_ENDED_FP_WIN:
        'Escaramuza terminada: no queda esbirro — ganan los Pueblos Libres.',
    SKIRMISH_ENDED_SHADOW_WIN:
        'Escaramuza terminada: el compañero murió — gana la Sombra.',
    SKIRMISH_ENDED_EMPTY: 'Escaramuza terminada: no quedan combatientes.',
    SKIRMISH_CANCELLED: (p) => `Combate cancelado (${p.card}).`,
    ARCHERY_TO_SHADOW_ASSIGN:
        'Paso a la asignación de heridas de la Sombra.',
    ARCHERY_FP_REMAINING: (p) =>
        `Asignación de arquería PL: ${p.count} restante(s).`,
    ARCHERY_SHADOW_REMAINING: (p) =>
        `Sombra: Asigna ${p.count} herida(s) más.`,
    ARCHERY_ALL_MINIONS_DEAD:
        '¡Todos los esbirros eliminados! Paso a Reagrupación.',
    SANCTUARY_HEAL_PROMPT:
        'Santuario: cura hasta 5 heridas en tus compañeros.',
    SANCTUARY_HEAL_REMAINING: (p) =>
        `Santuario: aún ${p.count} cura(s) posibles.`,
    THREAT_WOUNDS_REMAINING: (p) =>
        `Amenazas: aún ${p.count} herida(s) por asignar.`,
    THREAT_WOUNDS_DONE: 'Heridas de amenazas asignadas.',
    THREAT_WOUNDS_LOST:
        'No queda compañero que herir. Heridas de amenazas restantes perdidas.',
    REGROUP_FP_REFILL:
        'Pueblos Libres: Ajusta tu mano a 8 cartas y valida para terminar el turno.',
    REGROUP_ALREADY_DISCARDED:
        'Ya descartaste tu carta opcional este turno.',
    DISCARDED_CARD: (p) => `${p.player} descartó ${p.card}.`,
    REGROUP_MOVE_BLOCKED:
        'Movimiento extra impedido (sitio). Los Pueblos Libres reconstituyen la mano.',
    REGROUP_MOVE_LIMIT: (p) =>
        `Límite de movimiento alcanzado (${p.limit}/${p.limit}). Los Pueblos Libres reconstituyen la mano.`,
    REGROUP_FP_DECISION:
        'Pueblos Libres: Elige avanzar al siguiente sitio o terminar el turno.',
    SITE_WOUNDS_FP: (p) =>
        `Sitio: Pueblos Libres, asigna ${p.count} herida(s) a tus personajes.`,
    SITE_WOUNDS_FP_ALLIES: (p) =>
        `Sitio: Pueblos Libres, asigna ${p.count} herida(s) a tus compañeros (una por aliado).`,
    SITE_WOUNDS_SHADOW: (p) =>
        `Sitio: Sombra, asigna ${p.count} herida(s) a tus esbirros.`,
    SITE_WOUNDS_REMAINING: (p) =>
        `Sitio: aún ${p.count} herida(s) por asignar.`,
    SITE_WOUNDS_FP_NEXT: (p) =>
        `Sitio: Pueblos Libres, asigna ${p.count} herida(s).`,
    MUSTER_DISCARDED: (p) =>
        `${p.player} descartó ${p.card} (alistamiento ${p.discarded}/${p.allowed}).`,
    MUSTER_WAITING: (p) =>
        `${p.player} validó el alistamiento. Esperando a ${p.other}…`,
    GAME_WON: (p) => {
        const name = String(p.ringBearer || 'El Portador');
        const female = Boolean(p.female);
        const detail =
            p.reason === 'SITE_NINE'
                ? `${name}, con sus compañeros, destruyó el Anillo de Sauron.`
                : p.reason === 'CORRUPTION'
                  ? female
                      ? `${name} fue corrompida por la voluntad del Anillo.`
                      : `${name} fue corrompido por la voluntad del Anillo.`
                  : `${name} sucumbió a sus heridas.`;
        return `${p.player} gana la partida. ${detail}`;
    },
    PLAYED_FROM_DISCARD: (p) => `${p.card} se juega desde el descarte.`,
    PLAYED_FROM_DISCARD_UNDER: (p) =>
        `${p.card} se juega desde el descarte y se coloca bajo el mazo.`,
    PLAYED_FROM_DISCARD_ATTACHED: (p) =>
        `${p.card} se juega desde el descarte y se adjunta a ${p.host}.`,
    PLAYED_FROM_DISCARD_BATTLEFIELD: (p) =>
        `${p.card} entra al campo de batalla desde el descarte.`,
    GENERIC: (p) => String(p.text ?? ''),
};

export const STATUS_CATALOG: Record<
    SupportedLanguage,
    Record<StatusKey, Template>
> = { fr, en, de, it, es };
