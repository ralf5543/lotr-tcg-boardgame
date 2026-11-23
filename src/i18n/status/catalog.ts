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
    RESPONSE_PLAY_OR_PASS: 'Réponse : jouez une réponse ou passez.',
    RESPONSE_CHAIN_OR_PASS: 'Réponse : vous pouvez enchaîner ou passer.',
    RESPONSE_AUTO_EFFECT: (p) => `${p.title} : effet automatique.`,
    RING_PUT_ON_BURDENS: (p) => `${p.name} porte l’Anneau Unique : ${p.count} fardeau${Number(p.count) > 1 ? 's' : ''} à la place.`,
    CONSTRAINT_EXERT_OR_BURDEN: 'Contrainte : choisissez d’affaiblir le Porteur ou d’ajouter un fardeau.',
    DISCARD_PREVENTED: 'Défausse empêchée.',
    BURDEN_PREVENTED: 'Point-fardeau empêché.',
    ABILITY_CANCELLED: 'Capacité annulée.',
    RESPONSE_PREVENT_CANCEL_SKIRMISH: 'Réponse Ombre : empêcher l’annulation ou passer.',
    RESPONSE_ABOUT_TO_USE_ABILITY: 'Une capacité spéciale va se résoudre. Jouez une réponse ou passez.',
    RESPONSE_PREVENT_EXHAUST: 'Réponse Peuples Libres : empêcher l’épuisement ou passer.',
    RESPONSE_PREVENT_ASSIGN_DISCARD_UNBOUND: 'Réponse Peuples Libres : défaussez un compagnon dissocié pour empêcher l’affectation, ou passez.',
    RESPONSE_PREVENT_ASSIGN_EXERT: 'Réponse Peuples Libres : affaiblir ce compagnon pour empêcher l’affectation, ou passer.',
    PREVENT_CANCEL_PAID: (p) => `L’Ombre empêche l’annulation (−${p.count} crépuscule${Number(p.count) > 1 ? 's' : ''}).`,
    PREVENT_EXHAUST_PAID: (p) => `Les Peuples Libres empêchent (+${p.count} fardeau${Number(p.count) > 1 ? 'x' : ''}).`,
    CHOOSE_UNBOUND_DISCARD_PREVENT: 'Choisissez un compagnon dissocié à défausser pour empêcher l’affectation.',
    FORCE_ASSIGN_PREVENTED_EXERT: 'Les Peuples Libres empêchent l’affectation (compagnon affaibli).',
    THREATS_PREVENTED_WOUND_BEARER: 'Les Peuples Libres empêchent les menaces (Porteur blessé).',
    DISCARD_PREVENTED_TWILIGHT: (p) => `Les Peuples Libres empêchent la défausse (+${p.count} crépuscule${Number(p.count) > 1 ? 's' : ''}).`,
    DISCARD_PREVENTED_BURDENS: (p) => `Les Peuples Libres empêchent la défausse (+${p.count} fardeau${Number(p.count) > 1 ? 'x' : ''}).`,
    RESPONSE_PREVENT_THREATS: 'Réponse Peuples Libres : blesser le Porteur pour empêcher les menaces, ou passer.',
    RESPONSE_PREVENT_BURDEN: 'Réponse : empêcher l’ajout de point-fardeau ou passer.',
    RESPONSE_PREVENT_DISCARD_TWILIGHT: (p) => `Réponse Peuples Libres : ajouter ${p.count} crépuscule${Number(p.count) > 1 ? 's' : ''} pour empêcher la défausse, ou passer.`,
    RESPONSE_PREVENT_DISCARD_BURDENS: (p) => `Réponse Peuples Libres : ajouter ${p.count} fardeau${Number(p.count) > 1 ? 'x' : ''} pour empêcher la défausse, ou passer.`,
    RESPONSE_PREVENT_DISCARD: 'Réponse : empêcher la défausse ou passer.',
    RESPONSE_HEAL_SHADOW: 'Réponse Ombre : un compagnon a été soigné. Jouez une réponse ou passez.',
    RESPONSE_WINDOW_ABOUT_TO_WOUND: (p) => `${p.name} va prendre ${p.count} blessure${Number(p.count) > 1 ? 's' : ''}. Jouez une réponse ou passez.`,
    RESPONSE_WINDOW_ABOUT_TO_WOUND_GENERIC: 'Un personnage va prendre une blessure. Jouez une réponse ou passez.',
    RESPONSE_WINDOW_RING_WORN: 'L’Anneau Unique est porté. Jouez une autre réponse ou passez (fardeaux à la place).',
    RESPONSE_WINDOW_WINS: 'Un personnage a gagné ce combat. Jouez une réponse ou passez.',
    RESPONSE_WINDOW_LOSES: 'Un personnage a perdu ce combat. Jouez une réponse ou passez.',
    RESPONSE_WINDOW_TOOK_WOUND: 'Un personnage a pris une blessure. Jouez une réponse ou passez.',
    RESPONSE_WINDOW_DIED: 'Un personnage est mort. Jouez une réponse ou passez.',
    RESPONSE_WINDOW_CANCEL_SKIRMISH: (p) => `Une escarmouche va être annulée. Retirez ${p.count} crépuscule${Number(p.count) > 1 ? 's' : ''} pour empêcher, ou passez.`,
    RESPONSE_WINDOW_EXHAUST: (p) => `Un personnage va être épuisé. Ajoutez ${p.count} fardeau${Number(p.count) > 1 ? 'x' : ''} pour empêcher, ou passez.`,
    RESPONSE_WINDOW_FORCE_ASSIGN_UNBOUND: 'Un séide va être affecté au Porteur. Défaussez un compagnon dissocié pour empêcher, ou passez.',
    RESPONSE_WINDOW_FORCE_ASSIGN_EXERT: 'Un séide va être affecté à un compagnon. Affaiblissez ce compagnon pour empêcher, ou passez.',
    RESPONSE_WINDOW_ADD_THREATS: (p) => `${p.count} menace${Number(p.count) > 1 ? 's' : ''} ${Number(p.count) > 1 ? 'vont' : 'va'} être ajoutée${Number(p.count) > 1 ? 's' : ''}. Blessez le Porteur pour empêcher, ou passez.`,
    RESPONSE_WINDOW_ADD_BURDEN: (p) => `${p.count} point${Number(p.count) > 1 ? 's' : ''}-fardeau ${Number(p.count) > 1 ? 'vont' : 'va'} être ajouté${Number(p.count) > 1 ? 's' : ''}. Jouez une réponse ou passez.`,
    RESPONSE_WINDOW_DISCARD: 'Une carte va être défaussée. Jouez une réponse ou passez.',
    RESPONSE_WINDOW_DISCARD_TWILIGHT: (p) => `Une carte va être défaussée. Ajoutez ${p.count} crépuscule${Number(p.count) > 1 ? 's' : ''} pour empêcher, ou passez.`,
    RESPONSE_WINDOW_DISCARD_BURDENS: (p) => `Une carte va être défaussée. Ajoutez ${p.count} fardeau${Number(p.count) > 1 ? 'x' : ''} pour empêcher, ou passez.`,
    RESPONSE_WINDOW_HEALED: 'Un personnage a été soigné. Jouez une réponse ou passez.',
    RESPONSE_WINDOW_MOVED: 'La compagnie s’est déplacée. Jouez une réponse ou passez.',
    RESPONSE_WINDOW_PUT_ON_RING: 'Le Porteur a mis l’Anneau Unique. Jouez une réponse ou passez.',
    FELLOWSHIP_CARD_REVEALED: 'Une carte de la Compagnie a été révélée !',
    SITE_START_SHADOW_REGROUP: 'Début de regroupement : l’Ombre peut utiliser l’effet du site.',
    SITE_START_FELLOWSHIP: 'Début de compagnie : vous pouvez utiliser l’effet du site.',
    FELLOWSHIP_START_ABILITIES: 'Début de la phase de compagnie : Capacités spéciales.',
    SITE_PHASE_OPTIONAL_SPOT: 'Ombre : vous pouvez utiliser l’effet du site (Spot requis).',
    SITE_PHASE_DECLINED: 'Ombre : effet du site décliné.',
    SITE_PHASE_STILL_AVAILABLE: 'Ombre : vous pouvez encore utiliser l’effet du site, ou passer.',
    SITE_MOVE_DEPARTURE: 'Déplacement : vous pouvez utiliser l’effet du site que vous quittez.',
    SITE_MOVE_ARRIVAL: 'Déplacement : vous pouvez utiliser l’effet du site d’arrivée.',
    OPTIONAL_SITE_EFFECT: 'Vous pouvez activer l’effet optionnel de ce site.',
    OPTIONAL_EFFECT_DECLINED: 'Effet optionnel refusé.',
    SITE_FOLLOWER_EXERT_OFFER: 'Ombre : vous pouvez affaiblir un compagnon (×2) après le transfert de suivant.',
    SITE_FOLLOWER_DECLINED: 'Ombre : effet du site (transfert) décliné.',
    SITE_COMPANION_EXERTED: (p) => `${p.site || 'Le site'} : compagnon affaibli.`,
    RING_BEARER_CONSTRAINT_CHOICE: 'Contrainte du Porteur : choisissez une option pour commencer ce combat.',
    CHOOSE_EXERT_COMPANIONS: (p) => `Choisissez ${p.count} compagnons à affaiblir.`,
    CHOOSE_DISCARD_HAND: (p) => `Choisissez ${p.count} carte${Number(p.count) > 1 ? 's' : ''} de votre main à défausser.`,
    ACTION_CANCELLED: 'Action annulée.',
    THREATS_CLEARED_NO_TARGET: (p) => `${p.count} menace${Number(p.count) > 1 ? 's' : ''} retirée${Number(p.count) > 1 ? 's' : ''}, aucun compagnon à blesser.`,
    THREATS_ASSIGN_PROMPT: (p) => `Menaces : assignez ${p.count} blessure${Number(p.count) > 1 ? 's' : ''} à vos compagnons.`,
    INITIATIVE_GAINED: 'Les Peuples Libres gagnent l’initiative.',
    INITIATIVE_LOST: 'Les Peuples Libres perdent l’initiative.',
    REVEAL_CONFIRM: 'Cartes révélées : validez pour appliquer menaces / jetons et mélanger.',
    NO_CARDS_REVEALED: 'Aucune carte révélée.',
    REVEAL_VALIDATED_NO_DISCARD: 'Révélation validée sans défausse.',
    REVEALED_CARD_DISCARDED: (p) => `Carte révélée défaussée : ${p.card}.`,
    REVEALED_NO_SHADOW_UNDER: 'Main révélée : aucune carte Ombre sous la pioche.',
    REVEALED_NO_SHADOW: 'Main révélée : aucune carte Ombre.',
    REVEAL_VALIDATED_SHUFFLE: (p) => `Révélation validée : ${p.shadow} Ombre → menace(s), ${p.fp} PL → jeton(s). Pioche mélangée.`,
    FP_DISCARD_POSSESSION_OR_CONDITION: 'Peuples Libres : défaussez une possession ou une situation.',
    SHADOW_DISCARD_CONDITION: 'Ombre : défaussez une situation en jeu.',
    CARD_DISCARDED: (p) => `${p.card} est défaussée.`,
    ABILITY_ACTIVATED: (p) => `${p.card} active une capacité.`,
    FOLLOWER_ATTACHED: (p) => `${p.follower} est attaché à ${p.target}.`,
    DEAD_PILE_REMOVE: 'Falls of Rauros : placez une carte de votre pile de mort hors jeu.',
    REMOVED_FROM_PLAY: (p) => `${p.site || 'Le site'} : ${p.card} est retiré du jeu.`,
    ATTACHMENT_TRANSFERRED: (p) => `${p.card} est transféré de ${p.source} vers ${p.target} (Coût : ${p.cost} Crépuscule).`,
    TRANSFERRED_TO_HOST: (p) => `${p.card} est transféré sur ${p.host}.`,
    TRANSFER_LIMIT_ONE: (p) => `Limite 1 : ${p.card} est déjà sur ce personnage.`,
    TRANSFER_NOT_FOUND: (p) => `${p.card} introuvable en soutien ou défausse.`,
    DESIGNATE_TRANSFER_TARGET: 'Désignez le personnage pour le transfert.',
    REPLACED_IN_SKIRMISH: (p) => `${p.source} remplace ${p.target} dans le combat.`,
    BECOMES_MINION: (p) => `${p.name} devient un séide (force ${p.strength}, vitalité ${p.vitality}).`,
    MAKE_RING_BEARER: (p) => `${p.name} devient le Porteur de l’Anneau (résistance ${p.resistance}).`,
    MAKE_RING_BEARER_WITH_RING: (p) => `${p.name} devient le Porteur de l’Anneau (résistance ${p.resistance}) et reçoit l’Anneau Unique.`,
    SITE_PLACED_NEXT: (p) => `${p.site} est posé comme prochain site du chemin.`,
    SITE_REPLACES_NEXT: (p) => `${p.site} remplace le prochain site du chemin.`,
    TRANSFER_NO_SKIRMISHING_BEARER: 'Aucun compagnon n’escarmouche le porteur pour le transfert.',
    TRANSFER_NO_LOSER: 'Aucun perdant pour le transfert.',
    TRANSFER_NO_CLASS_SKIRMISH: 'Aucun personnage n’escarmouche la classe indiquée.',
    TRANSFER_NO_TARGET: 'Aucune cible pour le transfert.',
    FP_MUST_CHOOSE_OPTION: (p) =>
        p.title
            ? `${p.title} : les Peuples Libres doivent choisir une option.`
            : 'Les Peuples Libres doivent choisir une option.',
    REVEAL_MAY_DISCARD: 'Cartes révélées : cliquez-en une pour la défausser, ou validez sans défausser.',
    REVEAL_OPPONENT_HAND: 'Main adverse révélée : consultez les cartes puis validez.',
    REVEAL_YOUR_HAND_WAIT: 'Votre main est révélée : l’adversaire consulte…',
    SIDE_ROLES: (p) =>
        `${p.fp} joue les Peuples Libres. ${p.shadow} joue l’Ombre.`,
    SHADOW_MUST_CHOOSE_OPTION: 'L’Ombre doit choisir une option.',
    AID_NOT_FOLLOWER:
        'Transfert Aid impossible : la carte n’est pas un Suivant.',
    AID_SITE_FORBIDDEN:
        'Transfert Aid impossible : les suivants ne peuvent pas être transférés sur ce site.',
    AID_NO_COST:
        'Transfert Aid impossible : ce Suivant n’a pas de coût d’Aide.',
    AID_TWILIGHT_SHORT: (p) =>
        `Transfert Aid impossible : crépuscule insuffisant (${p.have}/${p.need}).`,
    AID_THREATS_AT_LIMIT:
        'Transfert Aid impossible : le nombre de menaces atteint déjà la limite (compagnons en jeu).',
    AID_TARGET_COMPANION:
        'Transfert Aid impossible : un Suivant des Peuples Libres doit être attaché à un Compagnon.',
    AID_TARGET_MINION:
        'Transfert Aid impossible : un Suivant de l’Ombre doit être attaché à un Séide.',
    SIDE_ROLES_NEW_TURN: (p) =>
        `Nouveau tour ! ${p.fp} joue les Peuples Libres. ${p.shadow} joue l’Ombre.`,
    SIDE_ROLES_PLACE_SITE_ONE: (p) =>
        `${p.fp} joue les Peuples Libres. ${p.shadow} joue l’Ombre. Posez le site 1.`,
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
    RESPONSE_PLAY_OR_PASS: 'Response: play a response or pass.',
    RESPONSE_CHAIN_OR_PASS: 'Response: you may play another or pass.',
    RESPONSE_AUTO_EFFECT: (p) => `${p.title}: automatic effect.`,
    RING_PUT_ON_BURDENS: (p) => `${p.name} puts on The One Ring: ${p.count} burden(s) instead.`,
    CONSTRAINT_EXERT_OR_BURDEN: 'Constraint: choose to exert the Ring-bearer or add a burden.',
    DISCARD_PREVENTED: 'Discard prevented.',
    BURDEN_PREVENTED: 'Burden prevented.',
    ABILITY_CANCELLED: 'Ability cancelled.',
    RESPONSE_PREVENT_CANCEL_SKIRMISH: 'Shadow response: prevent the cancel or pass.',
    RESPONSE_ABOUT_TO_USE_ABILITY: 'A special ability is about to resolve. Play a response or pass.',
    RESPONSE_PREVENT_EXHAUST: 'Free Peoples response: prevent the exhaust or pass.',
    RESPONSE_PREVENT_ASSIGN_DISCARD_UNBOUND: 'Free Peoples response: discard an unbound companion to prevent the assignment, or pass.',
    RESPONSE_PREVENT_ASSIGN_EXERT: 'Free Peoples response: exert this companion to prevent the assignment, or pass.',
    PREVENT_CANCEL_PAID: (p) => `Shadow prevents the cancel (−${p.count} Twilight).`,
    PREVENT_EXHAUST_PAID: (p) => `Free Peoples prevent (+${p.count} burden(s)).`,
    CHOOSE_UNBOUND_DISCARD_PREVENT: 'Choose an unbound companion to discard to prevent the assignment.',
    FORCE_ASSIGN_PREVENTED_EXERT: 'Free Peoples prevent the assignment (companion exerted).',
    THREATS_PREVENTED_WOUND_BEARER: 'Free Peoples prevent the threats (Ring-bearer wounded).',
    DISCARD_PREVENTED_TWILIGHT: (p) => `Free Peoples prevent the discard (+${p.count} Twilight).`,
    DISCARD_PREVENTED_BURDENS: (p) => `Free Peoples prevent the discard (+${p.count} burden(s)).`,
    RESPONSE_PREVENT_THREATS: 'Free Peoples response: wound the Ring-bearer to prevent the threats, or pass.',
    RESPONSE_PREVENT_BURDEN: 'Response: prevent adding a burden or pass.',
    RESPONSE_PREVENT_DISCARD_TWILIGHT: (p) => `Free Peoples response: add ${p.count} Twilight to prevent the discard, or pass.`,
    RESPONSE_PREVENT_DISCARD_BURDENS: (p) => `Free Peoples response: add ${p.count} burden(s) to prevent the discard, or pass.`,
    RESPONSE_PREVENT_DISCARD: 'Response: prevent the discard or pass.',
    RESPONSE_HEAL_SHADOW: 'Shadow response: a companion was healed. Play a response or pass.',
    RESPONSE_WINDOW_ABOUT_TO_WOUND: (p) => `${p.name} is about to take ${p.count} wound${Number(p.count) > 1 ? 's' : ''}. Play a response or pass.`,
    RESPONSE_WINDOW_ABOUT_TO_WOUND_GENERIC: 'A character is about to take a wound. Play a response or pass.',
    RESPONSE_WINDOW_RING_WORN: 'The One Ring is worn. Play another response or pass (burdens instead).',
    RESPONSE_WINDOW_WINS: 'A character won this skirmish. Play a response or pass.',
    RESPONSE_WINDOW_LOSES: 'A character lost this skirmish. Play a response or pass.',
    RESPONSE_WINDOW_TOOK_WOUND: 'A character took a wound. Play a response or pass.',
    RESPONSE_WINDOW_DIED: 'A character died. Play a response or pass.',
    RESPONSE_WINDOW_CANCEL_SKIRMISH: (p) => `A skirmish is about to be canceled. Remove ${p.count} Twilight to prevent, or pass.`,
    RESPONSE_WINDOW_EXHAUST: (p) => `A character is about to be exhausted. Add ${p.count} burden${Number(p.count) > 1 ? 's' : ''} to prevent, or pass.`,
    RESPONSE_WINDOW_FORCE_ASSIGN_UNBOUND: 'A minion is about to be assigned to the Ring-bearer. Discard an unbound companion to prevent, or pass.',
    RESPONSE_WINDOW_FORCE_ASSIGN_EXERT: 'A minion is about to be assigned to a companion. Exert that companion to prevent, or pass.',
    RESPONSE_WINDOW_ADD_THREATS: (p) => `${p.count} threat${Number(p.count) > 1 ? 's are' : ' is'} about to be added. Wound the Ring-bearer to prevent, or pass.`,
    RESPONSE_WINDOW_ADD_BURDEN: (p) => `${p.count} burden${Number(p.count) > 1 ? 's are' : ' is'} about to be added. Play a response or pass.`,
    RESPONSE_WINDOW_DISCARD: 'A card is about to be discarded. Play a response or pass.',
    RESPONSE_WINDOW_DISCARD_TWILIGHT: (p) => `A card is about to be discarded. Add ${p.count} Twilight to prevent, or pass.`,
    RESPONSE_WINDOW_DISCARD_BURDENS: (p) => `A card is about to be discarded. Add ${p.count} burden${Number(p.count) > 1 ? 's' : ''} to prevent, or pass.`,
    RESPONSE_WINDOW_HEALED: 'A character was healed. Play a response or pass.',
    RESPONSE_WINDOW_MOVED: 'The fellowship moved. Play a response or pass.',
    RESPONSE_WINDOW_PUT_ON_RING: 'The Ring-bearer put on the One Ring. Play a response or pass.',
    FELLOWSHIP_CARD_REVEALED: 'A Fellowship card was revealed!',
    SITE_START_SHADOW_REGROUP: 'Start of regroup: Shadow may use the site’s effect.',
    SITE_START_FELLOWSHIP: 'Start of fellowship: you may use the site’s effect.',
    FELLOWSHIP_START_ABILITIES: 'Start of Fellowship phase: Special abilities.',
    SITE_PHASE_OPTIONAL_SPOT: 'Shadow: you may use the site’s effect (Spot required).',
    SITE_PHASE_DECLINED: 'Shadow: site effect declined.',
    SITE_PHASE_STILL_AVAILABLE: 'Shadow: you may still use the site’s effect, or pass.',
    SITE_MOVE_DEPARTURE: 'Move: you may use the effect of the site you are leaving.',
    SITE_MOVE_ARRIVAL: 'Move: you may use the effect of the arrival site.',
    OPTIONAL_SITE_EFFECT: 'You may activate this site’s optional effect.',
    OPTIONAL_EFFECT_DECLINED: 'Optional effect declined.',
    SITE_FOLLOWER_EXERT_OFFER: 'Shadow: you may exert a companion (×2) after the follower transfer.',
    SITE_FOLLOWER_DECLINED: 'Shadow: site effect (transfer) declined.',
    SITE_COMPANION_EXERTED: (p) => `${p.site || 'The site'}: companion exerted.`,
    RING_BEARER_CONSTRAINT_CHOICE: 'Ring-bearer constraint: choose an option to begin this skirmish.',
    CHOOSE_EXERT_COMPANIONS: (p) => `Choose ${p.count} companion(s) to exert.`,
    CHOOSE_DISCARD_HAND: (p) => `Choose ${p.count} card(s) from your hand to discard.`,
    ACTION_CANCELLED: 'Action cancelled.',
    THREATS_CLEARED_NO_TARGET: (p) => `${p.count} threat(s) removed, no companion to wound.`,
    THREATS_ASSIGN_PROMPT: (p) => `Threats: assign ${p.count} wound(s) to your companions.`,
    INITIATIVE_GAINED: 'Free Peoples gain the initiative.',
    INITIATIVE_LOST: 'Free Peoples lose the initiative.',
    REVEAL_CONFIRM: 'Revealed cards: confirm to apply threats / tokens and shuffle.',
    NO_CARDS_REVEALED: 'No cards revealed.',
    REVEAL_VALIDATED_NO_DISCARD: 'Reveal confirmed without discard.',
    REVEALED_CARD_DISCARDED: (p) => `Revealed card discarded: ${p.card}.`,
    REVEALED_NO_SHADOW_UNDER: 'Hand revealed: no Shadow card under the draw deck.',
    REVEALED_NO_SHADOW: 'Hand revealed: no Shadow cards.',
    REVEAL_VALIDATED_SHUFFLE: (p) => `Reveal confirmed: ${p.shadow} Shadow → threat(s), ${p.fp} FP → token(s). Deck shuffled.`,
    FP_DISCARD_POSSESSION_OR_CONDITION: 'Free Peoples: discard a possession or a condition.',
    SHADOW_DISCARD_CONDITION: 'Shadow: discard a condition in play.',
    CARD_DISCARDED: (p) => `${p.card} is discarded.`,
    ABILITY_ACTIVATED: (p) => `${p.card} activates an ability.`,
    FOLLOWER_ATTACHED: (p) => `${p.follower} is attached to ${p.target}.`,
    DEAD_PILE_REMOVE: 'Falls of Rauros: place a card from your dead pile out of play.',
    REMOVED_FROM_PLAY: (p) => `${p.site || 'The site'}: ${p.card} is removed from the game.`,
    ATTACHMENT_TRANSFERRED: (p) => `${p.card} is transferred from ${p.source} to ${p.target} (Cost: ${p.cost} Twilight).`,
    TRANSFERRED_TO_HOST: (p) => `${p.card} is transferred onto ${p.host}.`,
    TRANSFER_LIMIT_ONE: (p) => `Limit 1: ${p.card} is already on this character.`,
    TRANSFER_NOT_FOUND: (p) => `${p.card} not found in support or discard.`,
    DESIGNATE_TRANSFER_TARGET: 'Choose the character for the transfer.',
    REPLACED_IN_SKIRMISH: (p) => `${p.source} replaces ${p.target} in the skirmish.`,
    BECOMES_MINION: (p) => `${p.name} becomes a minion (strength ${p.strength}, vitality ${p.vitality}).`,
    MAKE_RING_BEARER: (p) => `${p.name} becomes the Ring-bearer (resistance ${p.resistance}).`,
    MAKE_RING_BEARER_WITH_RING: (p) => `${p.name} becomes the Ring-bearer (resistance ${p.resistance}) and receives The One Ring.`,
    SITE_PLACED_NEXT: (p) => `${p.site} is placed as the next site on the path.`,
    SITE_REPLACES_NEXT: (p) => `${p.site} replaces the next site on the path.`,
    TRANSFER_NO_SKIRMISHING_BEARER: 'No companion is skirmishing the bearer for the transfer.',
    TRANSFER_NO_LOSER: 'No loser for the transfer.',
    TRANSFER_NO_CLASS_SKIRMISH: 'No character is skirmishing the indicated class.',
    TRANSFER_NO_TARGET: 'No target for the transfer.',
    FP_MUST_CHOOSE_OPTION: (p) =>
        p.title
            ? `${p.title}: Free Peoples must choose an option.`
            : 'Free Peoples must choose an option.',
    REVEAL_MAY_DISCARD: 'Revealed cards: click one to discard, or confirm without discarding.',
    REVEAL_OPPONENT_HAND: 'Opponent’s hand revealed: review the cards then confirm.',
    REVEAL_YOUR_HAND_WAIT: 'Your hand is revealed: the opponent is reviewing…',
    SIDE_ROLES: (p) =>
        `${p.fp} plays Free Peoples. ${p.shadow} plays Shadow.`,
    SHADOW_MUST_CHOOSE_OPTION: 'Shadow must choose an option.',
    AID_NOT_FOLLOWER:
        'Aid transfer impossible: the card is not a Follower.',
    AID_SITE_FORBIDDEN:
        'Aid transfer impossible: followers cannot be transferred at this site.',
    AID_NO_COST:
        'Aid transfer impossible: this Follower has no Aid cost.',
    AID_TWILIGHT_SHORT: (p) =>
        `Aid transfer impossible: not enough Twilight (${p.have}/${p.need}).`,
    AID_THREATS_AT_LIMIT:
        'Aid transfer impossible: threats already at the limit (companions in play).',
    AID_TARGET_COMPANION:
        'Aid transfer impossible: a Free Peoples Follower must attach to a Companion.',
    AID_TARGET_MINION:
        'Aid transfer impossible: a Shadow Follower must attach to a Minion.',
    SIDE_ROLES_NEW_TURN: (p) =>
        `New turn! ${p.fp} plays Free Peoples. ${p.shadow} plays Shadow.`,
    SIDE_ROLES_PLACE_SITE_ONE: (p) =>
        `${p.fp} plays Free Peoples. ${p.shadow} plays Shadow. Place site 1.`,
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
    RESPONSE_PLAY_OR_PASS: 'Reaktion: Spiele eine Reaktion oder passe.',
    RESPONSE_CHAIN_OR_PASS: 'Reaktion: Du kannst eine weitere spielen oder passen.',
    RESPONSE_AUTO_EFFECT: (p) => `${p.title}: automatischer Effekt.`,
    RING_PUT_ON_BURDENS: (p) => `${p.name} setzt den Einen Ring auf: ${p.count} Lastmarke(n) stattdessen.`,
    CONSTRAINT_EXERT_OR_BURDEN: 'Zwang: Wähle, den Ringträger anzuspannen oder eine Lastmarke hinzuzufügen.',
    DISCARD_PREVENTED: 'Ablage verhindert.',
    BURDEN_PREVENTED: 'Lastmarke verhindert.',
    ABILITY_CANCELLED: 'Fähigkeit abgebrochen.',
    RESPONSE_PREVENT_CANCEL_SKIRMISH: 'Schattenreaktion: Abbruch verhindern oder passen.',
    RESPONSE_ABOUT_TO_USE_ABILITY: 'Eine Spezialfähigkeit wird aufgelöst. Spiele eine Reaktion oder passe.',
    RESPONSE_PREVENT_EXHAUST: 'Reaktion Freie Völker: Erschöpfung verhindern oder passen.',
    RESPONSE_PREVENT_ASSIGN_DISCARD_UNBOUND: 'Reaktion Freie Völker: Lege einen ungebundenen Gefährten ab, um die Zuweisung zu verhindern, oder passe.',
    RESPONSE_PREVENT_ASSIGN_EXERT: 'Reaktion Freie Völker: Spanne diesen Gefährten an, um die Zuweisung zu verhindern, oder passe.',
    PREVENT_CANCEL_PAID: (p) => `Schatten verhindert den Abbruch (−${p.count} Einfluss).`,
    PREVENT_EXHAUST_PAID: (p) => `Freie Völker verhindern (+${p.count} Lastmarke(n)).`,
    CHOOSE_UNBOUND_DISCARD_PREVENT: 'Wähle einen ungebundenen Gefährten zum Ablegen, um die Zuweisung zu verhindern.',
    FORCE_ASSIGN_PREVENTED_EXERT: 'Freie Völker verhindern die Zuweisung (Gefährte angespannt).',
    THREATS_PREVENTED_WOUND_BEARER: 'Freie Völker verhindern die Bedrohungen (Ringträger verwundet).',
    DISCARD_PREVENTED_TWILIGHT: (p) => `Freie Völker verhindern die Ablage (+${p.count} Einfluss).`,
    DISCARD_PREVENTED_BURDENS: (p) => `Freie Völker verhindern die Ablage (+${p.count} Lastmarke(n)).`,
    RESPONSE_PREVENT_THREATS: 'Reaktion Freie Völker: Verwunde den Ringträger, um die Bedrohungen zu verhindern, oder passe.',
    RESPONSE_PREVENT_BURDEN: 'Reaktion: Hinzufügen einer Lastmarke verhindern oder passen.',
    RESPONSE_PREVENT_DISCARD_TWILIGHT: (p) => `Reaktion Freie Völker: Füge ${p.count} Einfluss hinzu, um die Ablage zu verhindern, oder passe.`,
    RESPONSE_PREVENT_DISCARD_BURDENS: (p) => `Reaktion Freie Völker: Füge ${p.count} Lastmarke(n) hinzu, um die Ablage zu verhindern, oder passe.`,
    RESPONSE_PREVENT_DISCARD: 'Reaktion: Ablage verhindern oder passen.',
    RESPONSE_HEAL_SHADOW: 'Schattenreaktion: Ein Gefährte wurde geheilt. Spiele eine Reaktion oder passe.',
    RESPONSE_WINDOW_ABOUT_TO_WOUND: (p) => `${p.name} erhält ${p.count} Wunde${Number(p.count) > 1 ? 'n' : ''}. Spiele eine Reaktion oder passe.`,
    RESPONSE_WINDOW_ABOUT_TO_WOUND_GENERIC: 'Ein Charakter erhält eine Wunde. Spiele eine Reaktion oder passe.',
    RESPONSE_WINDOW_RING_WORN: 'Der Eine Ring wird getragen. Spiele eine weitere Reaktion oder passe (Lastmarken statt).',
    RESPONSE_WINDOW_WINS: 'Ein Charakter hat diesen Kampf gewonnen. Spiele eine Reaktion oder passe.',
    RESPONSE_WINDOW_LOSES: 'Ein Charakter hat diesen Kampf verloren. Spiele eine Reaktion oder passe.',
    RESPONSE_WINDOW_TOOK_WOUND: 'Ein Charakter hat eine Wunde erhalten. Spiele eine Reaktion oder passe.',
    RESPONSE_WINDOW_DIED: 'Ein Charakter ist gestorben. Spiele eine Reaktion oder passe.',
    RESPONSE_WINDOW_CANCEL_SKIRMISH: (p) => `Ein Kampf wird abgebrochen. Entferne ${p.count} Einfluss, um zu verhindern, oder passe.`,
    RESPONSE_WINDOW_EXHAUST: (p) => `Ein Charakter wird erschöpft. Füge ${p.count} Lastmarke${Number(p.count) > 1 ? 'n' : ''} hinzu, um zu verhindern, oder passe.`,
    RESPONSE_WINDOW_FORCE_ASSIGN_UNBOUND: 'Ein Diener wird dem Ringträger zugewiesen. Lege einen ungebundenen Gefährten ab, um zu verhindern, oder passe.',
    RESPONSE_WINDOW_FORCE_ASSIGN_EXERT: 'Ein Diener wird einem Gefährten zugewiesen. Spanne diesen Gefährten an, um zu verhindern, oder passe.',
    RESPONSE_WINDOW_ADD_THREATS: (p) => `${p.count} Bedrohung${Number(p.count) > 1 ? 'en werden' : ' wird'} hinzugefügt. Verwunde den Ringträger, um zu verhindern, oder passe.`,
    RESPONSE_WINDOW_ADD_BURDEN: (p) => `${p.count} Lastmarke${Number(p.count) > 1 ? 'n werden' : ' wird'} hinzugefügt. Spiele eine Reaktion oder passe.`,
    RESPONSE_WINDOW_DISCARD: 'Eine Karte wird abgelegt. Spiele eine Reaktion oder passe.',
    RESPONSE_WINDOW_DISCARD_TWILIGHT: (p) => `Eine Karte wird abgelegt. Füge ${p.count} Einfluss hinzu, um zu verhindern, oder passe.`,
    RESPONSE_WINDOW_DISCARD_BURDENS: (p) => `Eine Karte wird abgelegt. Füge ${p.count} Lastmarke${Number(p.count) > 1 ? 'n' : ''} hinzu, um zu verhindern, oder passe.`,
    RESPONSE_WINDOW_HEALED: 'Ein Charakter wurde geheilt. Spiele eine Reaktion oder passe.',
    RESPONSE_WINDOW_MOVED: 'Die Gemeinschaft ist gezogen. Spiele eine Reaktion oder passe.',
    RESPONSE_WINDOW_PUT_ON_RING: 'Der Ringträger hat den Einen Ring aufgesetzt. Spiele eine Reaktion oder passe.',
    FELLOWSHIP_CARD_REVEALED: 'Eine Karte der Gemeinschaft wurde aufgedeckt!',
    SITE_START_SHADOW_REGROUP: 'Beginn des Sammelns: Schatten darf den Ortseffekt nutzen.',
    SITE_START_FELLOWSHIP: 'Beginn der Gemeinschaft: Du darfst den Ortseffekt nutzen.',
    FELLOWSHIP_START_ABILITIES: 'Beginn der Gemeinschaftsphase: Spezielle Fähigkeiten.',
    SITE_PHASE_OPTIONAL_SPOT: 'Schatten: Du darfst den Ortseffekt nutzen (Spot nötig).',
    SITE_PHASE_DECLINED: 'Schatten: Ortseffekt abgelehnt.',
    SITE_PHASE_STILL_AVAILABLE: 'Schatten: Du darfst den Ortseffekt noch nutzen, oder passen.',
    SITE_MOVE_DEPARTURE: 'Zug: Du darfst den Effekt des verlassenen Ortes nutzen.',
    SITE_MOVE_ARRIVAL: 'Zug: Du darfst den Effekt des Ankunftsortes nutzen.',
    OPTIONAL_SITE_EFFECT: 'Du darfst den optionalen Effekt dieses Ortes aktivieren.',
    OPTIONAL_EFFECT_DECLINED: 'Optionaler Effekt abgelehnt.',
    SITE_FOLLOWER_EXERT_OFFER: 'Schatten: Du darfst einen Gefährten (×2) anspannen nach dem Gefährten-Transfer.',
    SITE_FOLLOWER_DECLINED: 'Schatten: Ortseffekt (Transfer) abgelehnt.',
    SITE_COMPANION_EXERTED: (p) => `${p.site || 'Der Ort'}: Gefährte angespannt.`,
    RING_BEARER_CONSTRAINT_CHOICE: 'Zwang des Ringträgers: Wähle eine Option, um diesen Kampf zu beginnen.',
    CHOOSE_EXERT_COMPANIONS: (p) => `Wähle ${p.count} Gefährte(n) zum Anspannen.`,
    CHOOSE_DISCARD_HAND: (p) => `Wähle ${p.count} Karte(n) aus deiner Hand zum Ablegen.`,
    ACTION_CANCELLED: 'Aktion abgebrochen.',
    THREATS_CLEARED_NO_TARGET: (p) => `${p.count} Bedrohung(en) entfernt, kein Gefährte zu verwunden.`,
    THREATS_ASSIGN_PROMPT: (p) => `Bedrohungen: Weise ${p.count} Wunde(n) deinen Gefährten zu.`,
    INITIATIVE_GAINED: 'Freie Völker erhalten die Initiative.',
    INITIATIVE_LOST: 'Freie Völker verlieren die Initiative.',
    REVEAL_CONFIRM: 'Aufgedeckte Karten: Bestätige, um Bedrohungen / Marker anzuwenden und zu mischen.',
    NO_CARDS_REVEALED: 'Keine Karten aufgedeckt.',
    REVEAL_VALIDATED_NO_DISCARD: 'Aufdeckung bestätigt ohne Ablage.',
    REVEALED_CARD_DISCARDED: (p) => `Aufgedeckte Karte abgelegt: ${p.card}.`,
    REVEALED_NO_SHADOW_UNDER: 'Hand aufgedeckt: keine Schattenkarte unter dem Nachziehstapel.',
    REVEALED_NO_SHADOW: 'Hand aufgedeckt: keine Schattenkarten.',
    REVEAL_VALIDATED_SHUFFLE: (p) => `Aufdeckung bestätigt: ${p.shadow} Schatten → Bedrohung(en), ${p.fp} FV → Marker. Stapel gemischt.`,
    FP_DISCARD_POSSESSION_OR_CONDITION: 'Freie Völker: Lege einen Besitz oder Zustand ab.',
    SHADOW_DISCARD_CONDITION: 'Schatten: Lege einen Zustand im Spiel ab.',
    CARD_DISCARDED: (p) => `${p.card} wird abgelegt.`,
    ABILITY_ACTIVATED: (p) => `${p.card} aktiviert eine Fähigkeit.`,
    FOLLOWER_ATTACHED: (p) => `${p.follower} wird an ${p.target} angelegt.`,
    DEAD_PILE_REMOVE: 'Falls of Rauros: Lege eine Karte aus deinem Friedhof aus dem Spiel.',
    REMOVED_FROM_PLAY: (p) => `${p.site || 'Der Ort'}: ${p.card} wird aus dem Spiel entfernt.`,
    ATTACHMENT_TRANSFERRED: (p) => `${p.card} wird von ${p.source} nach ${p.target} transferiert (Kosten: ${p.cost} Einfluss).`,
    TRANSFERRED_TO_HOST: (p) => `${p.card} wird auf ${p.host} transferiert.`,
    TRANSFER_LIMIT_ONE: (p) => `Limit 1: ${p.card} ist bereits auf diesem Charakter.`,
    TRANSFER_NOT_FOUND: (p) => `${p.card} nicht in Unterstützung oder Ablage gefunden.`,
    DESIGNATE_TRANSFER_TARGET: 'Wähle den Charakter für den Transfer.',
    REPLACED_IN_SKIRMISH: (p) => `${p.source} ersetzt ${p.target} im Kampf.`,
    BECOMES_MINION: (p) => `${p.name} wird ein Diener (Stärke ${p.strength}, Vitalität ${p.vitality}).`,
    MAKE_RING_BEARER: (p) => `${p.name} wird der Ringträger (Widerstand ${p.resistance}).`,
    MAKE_RING_BEARER_WITH_RING: (p) => `${p.name} wird der Ringträger (Widerstand ${p.resistance}) und erhält den Einen Ring.`,
    SITE_PLACED_NEXT: (p) => `${p.site} wird als nächster Ort auf dem Pfad gelegt.`,
    SITE_REPLACES_NEXT: (p) => `${p.site} ersetzt den nächsten Ort auf dem Pfad.`,
    TRANSFER_NO_SKIRMISHING_BEARER: 'Kein Gefährte kämpft gegen den Träger für den Transfer.',
    TRANSFER_NO_LOSER: 'Kein Verlierer für den Transfer.',
    TRANSFER_NO_CLASS_SKIRMISH: 'Kein Charakter kämpft gegen die angegebene Klasse.',
    TRANSFER_NO_TARGET: 'Kein Ziel für den Transfer.',
    FP_MUST_CHOOSE_OPTION: (p) =>
        p.title
            ? `${p.title}: Freie Völker müssen eine Option wählen.`
            : 'Freie Völker müssen eine Option wählen.',
    REVEAL_MAY_DISCARD: 'Aufgedeckte Karten: Klicke eine zum Ablegen, oder bestätige ohne Ablage.',
    REVEAL_OPPONENT_HAND: 'Gegnerische Hand aufgedeckt: Sieh die Karten an und bestätige.',
    REVEAL_YOUR_HAND_WAIT: 'Deine Hand ist aufgedeckt: der Gegner prüft…',
    SIDE_ROLES: (p) =>
        `${p.fp} spielt die Freien Völker. ${p.shadow} spielt Schatten.`,
    SHADOW_MUST_CHOOSE_OPTION: 'Schatten muss eine Option wählen.',
    AID_NOT_FOLLOWER:
        'Aid-Transfer unmöglich: die Karte ist kein Gefährte.',
    AID_SITE_FORBIDDEN:
        'Aid-Transfer unmöglich: Gefährten können an diesem Ort nicht transferiert werden.',
    AID_NO_COST:
        'Aid-Transfer unmöglich: dieser Gefährte hat keine Aid-Kosten.',
    AID_TWILIGHT_SHORT: (p) =>
        `Aid-Transfer unmöglich: nicht genug Einfluss (${p.have}/${p.need}).`,
    AID_THREATS_AT_LIMIT:
        'Aid-Transfer unmöglich: Bedrohungen bereits am Limit (Gefährten im Spiel).',
    AID_TARGET_COMPANION:
        'Aid-Transfer unmöglich: ein Freie-Völker-Gefährte muss an einen Gefährten angelegt werden.',
    AID_TARGET_MINION:
        'Aid-Transfer unmöglich: ein Schatten-Gefährte muss an einen Diener angelegt werden.',
    SIDE_ROLES_NEW_TURN: (p) =>
        `Neuer Zug! ${p.fp} spielt die Freien Völker. ${p.shadow} spielt Schatten.`,
    SIDE_ROLES_PLACE_SITE_ONE: (p) =>
        `${p.fp} spielt die Freien Völker. ${p.shadow} spielt Schatten. Lege Ort 1.`,
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
    RESPONSE_PLAY_OR_PASS: 'Risposta: gioca una risposta o passa.',
    RESPONSE_CHAIN_OR_PASS: 'Risposta: puoi giocarne un’altra o passare.',
    RESPONSE_AUTO_EFFECT: (p) => `${p.title}: effetto automatico.`,
    RING_PUT_ON_BURDENS: (p) => `${p.name} indossa l’Unico Anello: ${p.count} fardello/i al posto.`,
    CONSTRAINT_EXERT_OR_BURDEN: 'Vincolo: scegli di affaticare il Portatore o aggiungere un fardello.',
    DISCARD_PREVENTED: 'Scarto impedito.',
    BURDEN_PREVENTED: 'Fardello impedito.',
    ABILITY_CANCELLED: 'Abilità annullata.',
    RESPONSE_PREVENT_CANCEL_SKIRMISH: 'Risposta Ombra: impedisci l’annullamento o passa.',
    RESPONSE_ABOUT_TO_USE_ABILITY: 'Un’abilità speciale sta per risolversi. Gioca una risposta o passa.',
    RESPONSE_PREVENT_EXHAUST: 'Risposta Popoli Liberi: impedisci l’esaurimento o passa.',
    RESPONSE_PREVENT_ASSIGN_DISCARD_UNBOUND: 'Risposta Popoli Liberi: scarta un compagno non vincolato per impedire l’assegnazione, o passa.',
    RESPONSE_PREVENT_ASSIGN_EXERT: 'Risposta Popoli Liberi: affatica questo compagno per impedire l’assegnazione, o passa.',
    PREVENT_CANCEL_PAID: (p) => `L’Ombra impedisce l’annullamento (−${p.count} Crepuscolo).`,
    PREVENT_EXHAUST_PAID: (p) => `I Popoli Liberi impediscono (+${p.count} fardello/i).`,
    CHOOSE_UNBOUND_DISCARD_PREVENT: 'Scegli un compagno non vincolato da scartare per impedire l’assegnazione.',
    FORCE_ASSIGN_PREVENTED_EXERT: 'I Popoli Liberi impediscono l’assegnazione (compagno affaticato).',
    THREATS_PREVENTED_WOUND_BEARER: 'I Popoli Liberi impediscono le minacce (Portatore ferito).',
    DISCARD_PREVENTED_TWILIGHT: (p) => `I Popoli Liberi impediscono lo scarto (+${p.count} Crepuscolo).`,
    DISCARD_PREVENTED_BURDENS: (p) => `I Popoli Liberi impediscono lo scarto (+${p.count} fardello/i).`,
    RESPONSE_PREVENT_THREATS: 'Risposta Popoli Liberi: ferisci il Portatore per impedire le minacce, o passa.',
    RESPONSE_PREVENT_BURDEN: 'Risposta: impedisci l’aggiunta di un fardello o passa.',
    RESPONSE_PREVENT_DISCARD_TWILIGHT: (p) => `Risposta Popoli Liberi: aggiungi ${p.count} Crepuscolo per impedire lo scarto, o passa.`,
    RESPONSE_PREVENT_DISCARD_BURDENS: (p) => `Risposta Popoli Liberi: aggiungi ${p.count} fardello/i per impedire lo scarto, o passa.`,
    RESPONSE_PREVENT_DISCARD: 'Risposta: impedisci lo scarto o passa.',
    RESPONSE_HEAL_SHADOW: 'Risposta Ombra: un compagno è stato curato. Gioca una risposta o passa.',
    RESPONSE_WINDOW_ABOUT_TO_WOUND: (p) => `${p.name} sta per subire ${p.count} ferit${Number(p.count) > 1 ? 'e' : 'a'}. Gioca una risposta o passa.`,
    RESPONSE_WINDOW_ABOUT_TO_WOUND_GENERIC: 'Un personaggio sta per subire una ferita. Gioca una risposta o passa.',
    RESPONSE_WINDOW_RING_WORN: 'L’Unico Anello è indossato. Gioca un’altra risposta o passa (fardelli al posto).',
    RESPONSE_WINDOW_WINS: 'Un personaggio ha vinto questo combattimento. Gioca una risposta o passa.',
    RESPONSE_WINDOW_LOSES: 'Un personaggio ha perso questo combattimento. Gioca una risposta o passa.',
    RESPONSE_WINDOW_TOOK_WOUND: 'Un personaggio ha subito una ferita. Gioca una risposta o passa.',
    RESPONSE_WINDOW_DIED: 'Un personaggio è morto. Gioca una risposta o passa.',
    RESPONSE_WINDOW_CANCEL_SKIRMISH: (p) => `Una schermaglia sta per essere annullata. Rimuovi ${p.count} Crepuscolo per impedire, o passa.`,
    RESPONSE_WINDOW_EXHAUST: (p) => `Un personaggio sta per essere esaurito. Aggiungi ${p.count} fardello/i per impedire, o passa.`,
    RESPONSE_WINDOW_FORCE_ASSIGN_UNBOUND: 'Un servitore sta per essere assegnato al Portatore. Scarta un compagno non vincolato per impedire, o passa.',
    RESPONSE_WINDOW_FORCE_ASSIGN_EXERT: 'Un servitore sta per essere assegnato a un compagno. Affatica quel compagno per impedire, o passa.',
    RESPONSE_WINDOW_ADD_THREATS: (p) => `${p.count} minaccia${Number(p.count) > 1 ? 'e stanno' : ' sta'} per essere aggiunte. Ferisci il Portatore per impedire, o passa.`,
    RESPONSE_WINDOW_ADD_BURDEN: (p) => `${p.count} fardello/i sta/stanno per essere aggiunto/i. Gioca una risposta o passa.`,
    RESPONSE_WINDOW_DISCARD: 'Una carta sta per essere scartata. Gioca una risposta o passa.',
    RESPONSE_WINDOW_DISCARD_TWILIGHT: (p) => `Una carta sta per essere scartata. Aggiungi ${p.count} Crepuscolo per impedire, o passa.`,
    RESPONSE_WINDOW_DISCARD_BURDENS: (p) => `Una carta sta per essere scartata. Aggiungi ${p.count} fardello/i per impedire, o passa.`,
    RESPONSE_WINDOW_HEALED: 'Un personaggio è stato curato. Gioca una risposta o passa.',
    RESPONSE_WINDOW_MOVED: 'La compagnia si è mossa. Gioca una risposta o passa.',
    RESPONSE_WINDOW_PUT_ON_RING: 'Il Portatore ha indossato l’Unico Anello. Gioca una risposta o passa.',
    FELLOWSHIP_CARD_REVEALED: 'Una carta della Compagnia è stata rivelata!',
    SITE_START_SHADOW_REGROUP: 'Inizio raduno: l’Ombra può usare l’effetto del sito.',
    SITE_START_FELLOWSHIP: 'Inizio compagnia: puoi usare l’effetto del sito.',
    FELLOWSHIP_START_ABILITIES: 'Inizio fase Compagnia: Abilità speciali.',
    SITE_PHASE_OPTIONAL_SPOT: 'Ombra: puoi usare l’effetto del sito (Spot richiesto).',
    SITE_PHASE_DECLINED: 'Ombra: effetto del sito declinato.',
    SITE_PHASE_STILL_AVAILABLE: 'Ombra: puoi ancora usare l’effetto del sito, o passare.',
    SITE_MOVE_DEPARTURE: 'Spostamento: puoi usare l’effetto del sito che lasci.',
    SITE_MOVE_ARRIVAL: 'Spostamento: puoi usare l’effetto del sito di arrivo.',
    OPTIONAL_SITE_EFFECT: 'Puoi attivare l’effetto opzionale di questo sito.',
    OPTIONAL_EFFECT_DECLINED: 'Effetto opzionale rifiutato.',
    SITE_FOLLOWER_EXERT_OFFER: 'Ombra: puoi affaticare un compagno (×2) dopo il trasferimento del seguace.',
    SITE_FOLLOWER_DECLINED: 'Ombra: effetto del sito (trasferimento) declinato.',
    SITE_COMPANION_EXERTED: (p) => `${p.site || 'Il sito'}: compagno affaticato.`,
    RING_BEARER_CONSTRAINT_CHOICE: 'Vincolo del Portatore: scegli un’opzione per iniziare questo combattimento.',
    CHOOSE_EXERT_COMPANIONS: (p) => `Scegli ${p.count} compagni da affaticare.`,
    CHOOSE_DISCARD_HAND: (p) => `Scegli ${p.count} carta/e dalla tua mano da scartare.`,
    ACTION_CANCELLED: 'Azione annullata.',
    THREATS_CLEARED_NO_TARGET: (p) => `${p.count} minaccia/e rimossa/e, nessun compagno da ferire.`,
    THREATS_ASSIGN_PROMPT: (p) => `Minacce: assegna ${p.count} ferita/e ai tuoi compagni.`,
    INITIATIVE_GAINED: 'I Popoli Liberi ottengono l’iniziativa.',
    INITIATIVE_LOST: 'I Popoli Liberi perdono l’iniziativa.',
    REVEAL_CONFIRM: 'Carte rivelate: conferma per applicare minacce / gettoni e mescolare.',
    NO_CARDS_REVEALED: 'Nessuna carta rivelata.',
    REVEAL_VALIDATED_NO_DISCARD: 'Rivelazione confermata senza scarto.',
    REVEALED_CARD_DISCARDED: (p) => `Carta rivelata scartata: ${p.card}.`,
    REVEALED_NO_SHADOW_UNDER: 'Mano rivelata: nessuna carta Ombra sotto il mazzo.',
    REVEALED_NO_SHADOW: 'Mano rivelata: nessuna carta Ombra.',
    REVEAL_VALIDATED_SHUFFLE: (p) => `Rivelazione confermata: ${p.shadow} Ombra → minaccia/e, ${p.fp} PL → gettone/i. Mazzo mescolato.`,
    FP_DISCARD_POSSESSION_OR_CONDITION: 'Popoli Liberi: scarta un possesso o una condizione.',
    SHADOW_DISCARD_CONDITION: 'Ombra: scarta una condizione in gioco.',
    CARD_DISCARDED: (p) => `${p.card} è scartata.`,
    ABILITY_ACTIVATED: (p) => `${p.card} attiva un’abilità.`,
    FOLLOWER_ATTACHED: (p) => `${p.follower} è attaccato a ${p.target}.`,
    DEAD_PILE_REMOVE: 'Falls of Rauros: metti una carta dalla pila dei morti fuori gioco.',
    REMOVED_FROM_PLAY: (p) => `${p.site || 'Il sito'}: ${p.card} è rimosso dal gioco.`,
    ATTACHMENT_TRANSFERRED: (p) => `${p.card} è trasferito da ${p.source} a ${p.target} (Costo: ${p.cost} Crepuscolo).`,
    TRANSFERRED_TO_HOST: (p) => `${p.card} è trasferito su ${p.host}.`,
    TRANSFER_LIMIT_ONE: (p) => `Limite 1: ${p.card} è già su questo personaggio.`,
    TRANSFER_NOT_FOUND: (p) => `${p.card} introvabile in supporto o scarti.`,
    DESIGNATE_TRANSFER_TARGET: 'Designa il personaggio per il trasferimento.',
    REPLACED_IN_SKIRMISH: (p) => `${p.source} sostituisce ${p.target} nel combattimento.`,
    BECOMES_MINION: (p) => `${p.name} diventa un servitore (forza ${p.strength}, vitalità ${p.vitality}).`,
    MAKE_RING_BEARER: (p) => `${p.name} diventa il Portatore (resistenza ${p.resistance}).`,
    MAKE_RING_BEARER_WITH_RING: (p) => `${p.name} diventa il Portatore (resistenza ${p.resistance}) e riceve l’Unico Anello.`,
    SITE_PLACED_NEXT: (p) => `${p.site} è piazzato come prossimo sito del percorso.`,
    SITE_REPLACES_NEXT: (p) => `${p.site} sostituisce il prossimo sito del percorso.`,
    TRANSFER_NO_SKIRMISHING_BEARER: 'Nessun compagno schermaglia il portatore per il trasferimento.',
    TRANSFER_NO_LOSER: 'Nessun perdente per il trasferimento.',
    TRANSFER_NO_CLASS_SKIRMISH: 'Nessun personaggio schermaglia la classe indicata.',
    TRANSFER_NO_TARGET: 'Nessun bersaglio per il trasferimento.',
    FP_MUST_CHOOSE_OPTION: (p) =>
        p.title
            ? `${p.title}: i Popoli Liberi devono scegliere un’opzione.`
            : 'I Popoli Liberi devono scegliere un’opzione.',
    REVEAL_MAY_DISCARD: 'Carte rivelate: cliccane una per scartarla, o conferma senza scartare.',
    REVEAL_OPPONENT_HAND: 'Mano avversaria rivelata: consulta le carte poi conferma.',
    REVEAL_YOUR_HAND_WAIT: 'La tua mano è rivelata: l’avversario consulta…',
    SIDE_ROLES: (p) =>
        `${p.fp} gioca i Popoli Liberi. ${p.shadow} gioca Ombra.`,
    SHADOW_MUST_CHOOSE_OPTION: 'L’Ombra deve scegliere un’opzione.',
    AID_NOT_FOLLOWER:
        'Trasferimento Aid impossibile: la carta non è un Seguace.',
    AID_SITE_FORBIDDEN:
        'Trasferimento Aid impossibile: i seguaci non possono essere trasferiti su questo sito.',
    AID_NO_COST:
        'Trasferimento Aid impossibile: questo Seguace non ha un costo Aid.',
    AID_TWILIGHT_SHORT: (p) =>
        `Trasferimento Aid impossibile: crepuscolo insufficiente (${p.have}/${p.need}).`,
    AID_THREATS_AT_LIMIT:
        'Trasferimento Aid impossibile: le minacce sono già al limite (compagni in gioco).',
    AID_TARGET_COMPANION:
        'Trasferimento Aid impossibile: un Seguace dei Popoli Liberi deve essere attaccato a un Compagno.',
    AID_TARGET_MINION:
        'Trasferimento Aid impossibile: un Seguace dell’Ombra deve essere attaccato a un Servitore.',
    SIDE_ROLES_NEW_TURN: (p) =>
        `Nuovo turno! ${p.fp} gioca i Popoli Liberi. ${p.shadow} gioca Ombra.`,
    SIDE_ROLES_PLACE_SITE_ONE: (p) =>
        `${p.fp} gioca i Popoli Liberi. ${p.shadow} gioca Ombra. Piazza il sito 1.`,
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
    RESPONSE_PLAY_OR_PASS: 'Respuesta: juega una respuesta o pasa.',
    RESPONSE_CHAIN_OR_PASS: 'Respuesta: puedes jugar otra o pasar.',
    RESPONSE_AUTO_EFFECT: (p) => `${p.title}: efecto automático.`,
    RING_PUT_ON_BURDENS: (p) => `${p.name} se pone el Anillo Único: ${p.count} carga(s) en su lugar.`,
    CONSTRAINT_EXERT_OR_BURDEN: 'Restricción: elige agotar al Portador o añadir una carga.',
    DISCARD_PREVENTED: 'Descarte impedido.',
    BURDEN_PREVENTED: 'Carga impedida.',
    ABILITY_CANCELLED: 'Habilidad cancelada.',
    RESPONSE_PREVENT_CANCEL_SKIRMISH: 'Respuesta Sombra: impide la cancelación o pasa.',
    RESPONSE_ABOUT_TO_USE_ABILITY: 'Una habilidad especial va a resolverse. Juega una respuesta o pasa.',
    RESPONSE_PREVENT_EXHAUST: 'Respuesta Pueblos Libres: impide el agotamiento o pasa.',
    RESPONSE_PREVENT_ASSIGN_DISCARD_UNBOUND: 'Respuesta Pueblos Libres: descarta un compañero no vinculado para impedir la asignación, o pasa.',
    RESPONSE_PREVENT_ASSIGN_EXERT: 'Respuesta Pueblos Libres: agota a este compañero para impedir la asignación, o pasa.',
    PREVENT_CANCEL_PAID: (p) => `La Sombra impide la cancelación (−${p.count} Crepúsculo).`,
    PREVENT_EXHAUST_PAID: (p) => `Los Pueblos Libres impiden (+${p.count} carga(s)).`,
    CHOOSE_UNBOUND_DISCARD_PREVENT: 'Elige un compañero no vinculado que descartar para impedir la asignación.',
    FORCE_ASSIGN_PREVENTED_EXERT: 'Los Pueblos Libres impiden la asignación (compañero agotado).',
    THREATS_PREVENTED_WOUND_BEARER: 'Los Pueblos Libres impiden las amenazas (Portador herido).',
    DISCARD_PREVENTED_TWILIGHT: (p) => `Los Pueblos Libres impiden el descarte (+${p.count} Crepúsculo).`,
    DISCARD_PREVENTED_BURDENS: (p) => `Los Pueblos Libres impiden el descarte (+${p.count} carga(s)).`,
    RESPONSE_PREVENT_THREATS: 'Respuesta Pueblos Libres: hiere al Portador para impedir las amenazas, o pasa.',
    RESPONSE_PREVENT_BURDEN: 'Respuesta: impide añadir una carga o pasa.',
    RESPONSE_PREVENT_DISCARD_TWILIGHT: (p) => `Respuesta Pueblos Libres: añade ${p.count} Crepúsculo para impedir el descarte, o pasa.`,
    RESPONSE_PREVENT_DISCARD_BURDENS: (p) => `Respuesta Pueblos Libres: añade ${p.count} carga(s) para impedir el descarte, o pasa.`,
    RESPONSE_PREVENT_DISCARD: 'Respuesta: impide el descarte o pasa.',
    RESPONSE_HEAL_SHADOW: 'Respuesta Sombra: se curó a un compañero. Juega una respuesta o pasa.',
    RESPONSE_WINDOW_ABOUT_TO_WOUND: (p) => `${p.name} va a recibir ${p.count} herida${Number(p.count) > 1 ? 's' : ''}. Juega una respuesta o pasa.`,
    RESPONSE_WINDOW_ABOUT_TO_WOUND_GENERIC: 'Un personaje va a recibir una herida. Juega una respuesta o pasa.',
    RESPONSE_WINDOW_RING_WORN: 'El Anillo Único está puesto. Juega otra respuesta o pasa (cargas en su lugar).',
    RESPONSE_WINDOW_WINS: 'Un personaje ganó este combate. Juega una respuesta o pasa.',
    RESPONSE_WINDOW_LOSES: 'Un personaje perdió este combate. Juega una respuesta o pasa.',
    RESPONSE_WINDOW_TOOK_WOUND: 'Un personaje recibió una herida. Juega una respuesta o pasa.',
    RESPONSE_WINDOW_DIED: 'Un personaje murió. Juega una respuesta o pasa.',
    RESPONSE_WINDOW_CANCEL_SKIRMISH: (p) => `Una escaramuza va a cancelarse. Quita ${p.count} Crepúsculo para impedir, o pasa.`,
    RESPONSE_WINDOW_EXHAUST: (p) => `Un personaje va a agotarse por completo. Añade ${p.count} carga${Number(p.count) > 1 ? 's' : ''} para impedir, o pasa.`,
    RESPONSE_WINDOW_FORCE_ASSIGN_UNBOUND: 'Un esbirro va a asignarse al Portador. Descarta un compañero no vinculado para impedir, o pasa.',
    RESPONSE_WINDOW_FORCE_ASSIGN_EXERT: 'Un esbirro va a asignarse a un compañero. Agota a ese compañero para impedir, o pasa.',
    RESPONSE_WINDOW_ADD_THREATS: (p) => `${p.count} amenaza${Number(p.count) > 1 ? 's van' : ' va'} a añadirse. Hiere al Portador para impedir, o pasa.`,
    RESPONSE_WINDOW_ADD_BURDEN: (p) => `${p.count} carga${Number(p.count) > 1 ? 's van' : ' va'} a añadirse. Juega una respuesta o pasa.`,
    RESPONSE_WINDOW_DISCARD: 'Una carta va a descartarse. Juega una respuesta o pasa.',
    RESPONSE_WINDOW_DISCARD_TWILIGHT: (p) => `Una carta va a descartarse. Añade ${p.count} Crepúsculo para impedir, o pasa.`,
    RESPONSE_WINDOW_DISCARD_BURDENS: (p) => `Una carta va a descartarse. Añade ${p.count} carga${Number(p.count) > 1 ? 's' : ''} para impedir, o pasa.`,
    RESPONSE_WINDOW_HEALED: 'Se curó a un personaje. Juega una respuesta o pasa.',
    RESPONSE_WINDOW_MOVED: 'La compañía se desplazó. Juega una respuesta o pasa.',
    RESPONSE_WINDOW_PUT_ON_RING: 'El Portador se puso el Anillo Único. Juega una respuesta o pasa.',
    FELLOWSHIP_CARD_REVEALED: '¡Se reveló una carta de la Compañía!',
    SITE_START_SHADOW_REGROUP: 'Inicio de reagrupación: la Sombra puede usar el efecto del sitio.',
    SITE_START_FELLOWSHIP: 'Inicio de compañía: puedes usar el efecto del sitio.',
    FELLOWSHIP_START_ABILITIES: 'Inicio de la fase de Compañía: Habilidades especiales.',
    SITE_PHASE_OPTIONAL_SPOT: 'Sombra: puedes usar el efecto del sitio (Spot requerido).',
    SITE_PHASE_DECLINED: 'Sombra: efecto del sitio rechazado.',
    SITE_PHASE_STILL_AVAILABLE: 'Sombra: aún puedes usar el efecto del sitio, o pasar.',
    SITE_MOVE_DEPARTURE: 'Movimiento: puedes usar el efecto del sitio que abandonas.',
    SITE_MOVE_ARRIVAL: 'Movimiento: puedes usar el efecto del sitio de llegada.',
    OPTIONAL_SITE_EFFECT: 'Puedes activar el efecto opcional de este sitio.',
    OPTIONAL_EFFECT_DECLINED: 'Efecto opcional rechazado.',
    SITE_FOLLOWER_EXERT_OFFER: 'Sombra: puedes agotar a un compañero (×2) tras el traslado del seguidor.',
    SITE_FOLLOWER_DECLINED: 'Sombra: efecto del sitio (traslado) rechazado.',
    SITE_COMPANION_EXERTED: (p) => `${p.site || 'El sitio'}: compañero agotado.`,
    RING_BEARER_CONSTRAINT_CHOICE: 'Restricción del Portador: elige una opción para empezar este combate.',
    CHOOSE_EXERT_COMPANIONS: (p) => `Elige ${p.count} compañero(s) que agotar.`,
    CHOOSE_DISCARD_HAND: (p) => `Elige ${p.count} carta(s) de tu mano que descartar.`,
    ACTION_CANCELLED: 'Acción cancelada.',
    THREATS_CLEARED_NO_TARGET: (p) => `${p.count} amenaza(s) retirada(s), ningún compañero que herir.`,
    THREATS_ASSIGN_PROMPT: (p) => `Amenazas: asigna ${p.count} herida(s) a tus compañeros.`,
    INITIATIVE_GAINED: 'Los Pueblos Libres ganan la iniciativa.',
    INITIATIVE_LOST: 'Los Pueblos Libres pierden la iniciativa.',
    REVEAL_CONFIRM: 'Cartas reveladas: valida para aplicar amenazas / fichas y barajar.',
    NO_CARDS_REVEALED: 'Ninguna carta revelada.',
    REVEAL_VALIDATED_NO_DISCARD: 'Revelación validada sin descarte.',
    REVEALED_CARD_DISCARDED: (p) => `Carta revelada descartada: ${p.card}.`,
    REVEALED_NO_SHADOW_UNDER: 'Mano revelada: ninguna carta Sombra bajo el mazo.',
    REVEALED_NO_SHADOW: 'Mano revelada: ninguna carta Sombra.',
    REVEAL_VALIDATED_SHUFFLE: (p) => `Revelación validada: ${p.shadow} Sombra → amenaza(s), ${p.fp} PL → ficha(s). Mazo barajado.`,
    FP_DISCARD_POSSESSION_OR_CONDITION: 'Pueblos Libres: descarta una posesión o una condición.',
    SHADOW_DISCARD_CONDITION: 'Sombra: descarta una condición en juego.',
    CARD_DISCARDED: (p) => `${p.card} se descarta.`,
    ABILITY_ACTIVATED: (p) => `${p.card} activa una habilidad.`,
    FOLLOWER_ATTACHED: (p) => `${p.follower} se adjunta a ${p.target}.`,
    DEAD_PILE_REMOVE: 'Falls of Rauros: pon una carta de tu cementerio fuera de juego.',
    REMOVED_FROM_PLAY: (p) => `${p.site || 'El sitio'}: ${p.card} se retira del juego.`,
    ATTACHMENT_TRANSFERRED: (p) => `${p.card} se traslada de ${p.source} a ${p.target} (Coste: ${p.cost} Crepúsculo).`,
    TRANSFERRED_TO_HOST: (p) => `${p.card} se traslada a ${p.host}.`,
    TRANSFER_LIMIT_ONE: (p) => `Límite 1: ${p.card} ya está en este personaje.`,
    TRANSFER_NOT_FOUND: (p) => `${p.card} no encontrado en apoyo o descarte.`,
    DESIGNATE_TRANSFER_TARGET: 'Designa el personaje para el traslado.',
    REPLACED_IN_SKIRMISH: (p) => `${p.source} reemplaza a ${p.target} en el combate.`,
    BECOMES_MINION: (p) => `${p.name} se convierte en esbirro (fuerza ${p.strength}, vitalidad ${p.vitality}).`,
    MAKE_RING_BEARER: (p) => `${p.name} se convierte en el Portador (resistencia ${p.resistance}).`,
    MAKE_RING_BEARER_WITH_RING: (p) => `${p.name} se convierte en el Portador (resistencia ${p.resistance}) y recibe el Anillo Único.`,
    SITE_PLACED_NEXT: (p) => `${p.site} se coloca como siguiente sitio del camino.`,
    SITE_REPLACES_NEXT: (p) => `${p.site} reemplaza el siguiente sitio del camino.`,
    TRANSFER_NO_SKIRMISHING_BEARER: 'Ningún compañero combate al portador para el traslado.',
    TRANSFER_NO_LOSER: 'Ningún perdedor para el traslado.',
    TRANSFER_NO_CLASS_SKIRMISH: 'Ningún personaje combate la clase indicada.',
    TRANSFER_NO_TARGET: 'Ningún objetivo para el traslado.',
    FP_MUST_CHOOSE_OPTION: (p) =>
        p.title
            ? `${p.title}: los Pueblos Libres deben elegir una opción.`
            : 'Los Pueblos Libres deben elegir una opción.',
    REVEAL_MAY_DISCARD: 'Cartas reveladas: haz clic en una para descartarla, o valida sin descartar.',
    REVEAL_OPPONENT_HAND: 'Mano rival revelada: consulta las cartas y valida.',
    REVEAL_YOUR_HAND_WAIT: 'Tu mano está revelada: el rival consulta…',
    SIDE_ROLES: (p) =>
        `${p.fp} juega Pueblos Libres. ${p.shadow} juega Sombra.`,
    SHADOW_MUST_CHOOSE_OPTION: 'La Sombra debe elegir una opción.',
    AID_NOT_FOLLOWER:
        'Traslado Aid imposible: la carta no es un Seguidor.',
    AID_SITE_FORBIDDEN:
        'Traslado Aid imposible: los seguidores no pueden trasladarse en este sitio.',
    AID_NO_COST:
        'Traslado Aid imposible: este Seguidor no tiene coste Aid.',
    AID_TWILIGHT_SHORT: (p) =>
        `Traslado Aid imposible: crepúsculo insuficiente (${p.have}/${p.need}).`,
    AID_THREATS_AT_LIMIT:
        'Traslado Aid imposible: las amenazas ya están al límite (compañeros en juego).',
    AID_TARGET_COMPANION:
        'Traslado Aid imposible: un Seguidor de Pueblos Libres debe adjuntarse a un Compañero.',
    AID_TARGET_MINION:
        'Traslado Aid imposible: un Seguidor de Sombra debe adjuntarse a un Esbirro.',
    SIDE_ROLES_NEW_TURN: (p) =>
        `¡Nuevo turno! ${p.fp} juega Pueblos Libres. ${p.shadow} juega Sombra.`,
    SIDE_ROLES_PLACE_SITE_ONE: (p) =>
        `${p.fp} juega Pueblos Libres. ${p.shadow} juega Sombra. Coloca el sitio 1.`,
    GENERIC: (p) => String(p.text ?? ''),
};

export const STATUS_CATALOG: Record<
    SupportedLanguage,
    Record<StatusKey, Template>
> = { fr, en, de, it, es };
