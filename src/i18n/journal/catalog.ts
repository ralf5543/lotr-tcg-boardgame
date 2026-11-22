import type { SupportedLanguage } from '../languages';
import type { JournalForms, JournalKey, JournalParams } from './types';

type Template = JournalForms | ((p: JournalParams) => JournalForms);

const phaseLabel: Record<
    SupportedLanguage,
    Record<string, string>
> = {
    fr: {
        FELLOWSHIP: 'Compagnie',
        SHADOW: 'Ombre',
        MANEUVER: 'Manœuvre',
        ARCHERY: 'Archerie',
        ASSIGNMENT: 'Affectation',
        SKIRMISH: 'Combat',
        REGROUP: 'Ralliement',
        SETUP: 'Mise en place',
    },
    en: {
        FELLOWSHIP: 'Fellowship',
        SHADOW: 'Shadow',
        MANEUVER: 'Maneuver',
        ARCHERY: 'Archery',
        ASSIGNMENT: 'Assignment',
        SKIRMISH: 'Skirmish',
        REGROUP: 'Regroup',
        SETUP: 'Setup',
    },
    de: {
        FELLOWSHIP: 'Gemeinschaft',
        SHADOW: 'Schatten',
        MANEUVER: 'Manöver',
        ARCHERY: 'Fernkampf',
        ASSIGNMENT: 'Zuweisung',
        SKIRMISH: 'Kampf',
        REGROUP: 'Sammeln',
        SETUP: 'Vorbereitung',
    },
    it: {
        FELLOWSHIP: 'Compagnia',
        SHADOW: 'Ombra',
        MANEUVER: 'Manovra',
        ARCHERY: 'Tiro',
        ASSIGNMENT: 'Assegnazione',
        SKIRMISH: 'Schermaglia',
        REGROUP: 'Raduno',
        SETUP: 'Preparazione',
    },
    es: {
        FELLOWSHIP: 'Compañía',
        SHADOW: 'Sombra',
        MANEUVER: 'Maniobra',
        ARCHERY: 'Arquería',
        ASSIGNMENT: 'Asignación',
        SKIRMISH: 'Escaramuza',
        REGROUP: 'Reagrupación',
        SETUP: 'Preparación',
    },
};

function woundVia(
    lang: SupportedLanguage,
    source?: string | number | boolean | null
): string {
    const s = String(source || '');
    const map: Record<SupportedLanguage, Record<string, string>> = {
        fr: { archery: ' (archerie)', threat: ' (menaces)', site: ' (site)' },
        en: { archery: ' (archery)', threat: ' (threats)', site: ' (site)' },
        de: {
            archery: ' (Fernkampf)',
            threat: ' (Bedrohungen)',
            site: ' (Ort)',
        },
        it: { archery: ' (tiro)', threat: ' (minacce)', site: ' (sito)' },
        es: {
            archery: ' (arquería)',
            threat: ' (amenazas)',
            site: ' (sitio)',
        },
    };
    return map[lang][s] || '';
}

function woundsPhrase(lang: SupportedLanguage, count: number): string {
    const n = Math.max(1, Math.floor(Number(count) || 1));
    if (lang === 'fr') {
        if (n === 1) return 'une blessure';
        if (n === 2) return 'deux blessures';
        return `${n} blessures`;
    }
    if (lang === 'en') return n === 1 ? 'a wound' : `${n} wounds`;
    if (lang === 'de') return n === 1 ? 'eine Wunde' : `${n} Wunden`;
    if (lang === 'it') return n === 1 ? 'una ferita' : `${n} ferite`;
    return n === 1 ? 'una herida' : `${n} heridas`;
}

const fr: Record<JournalKey, Template> = {
    PHASE: (p) => ({
        named: `Phase ${phaseLabel.fr[String(p.phaseKey)] || p.phaseKey}`,
    }),
    PLAYED_CARD: (p) => ({
        vous: `Vous avez joué ${p.card}.`,
        named: `${p.player} a joué ${p.card}.`,
    }),
    DISCARDED_FROM_PLAY: (p) => ({
        named: `${p.card} est défaussé.`,
    }),
    WOUND_TAKEN: (p) => ({
        named: `${p.card} prend ${woundsPhrase('fr', Number(p.count) || 1)}${woundVia('fr', p.source)}.`,
    }),
    WOUND_TAKEN_DIED: (p) => ({
        named: `${p.card} prend ${woundsPhrase('fr', Number(p.count) || 1)}${woundVia('fr', p.source)} et meurt.`,
    }),
    HEALED: (p) => ({
        named:
            Number(p.count) > 1
                ? `${p.card} est soigné (${woundsPhrase('fr', Number(p.count))}).`
                : `${p.card} est soigné.`,
    }),
    MOVED_TO_SITE: (p) => ({
        named: `La compagnie avance au site ${p.siteNumber} : ${p.siteName}.`,
    }),
    DECIDED_STOP: (p) => ({
        vous: 'Vous avez décidé de vous arrêter.',
        named: `${p.player} a décidé de s’arrêter.`,
    }),
    DECIDED_MOVE_AGAIN: (p) => ({
        vous: 'Vous avez décidé d’avancer de nouveau.',
        named: `${p.player} a décidé d’avancer de nouveau.`,
    }),
    SIDE_FREE_PEOPLES: (p) => ({
        vous: `${p.prefix || ''}Vous jouez les Peuples Libres.`.trim(),
        named: `${p.prefix || ''}${p.player} joue les Peuples Libres.`.trim(),
    }),
    SIDE_SHADOW: (p) => ({
        vous: 'Vous jouez l’Ombre.',
        named: `${p.player} joue l’Ombre.`,
    }),
    SETUP_COMPLETE: { named: 'Mise en place terminée. Début de la partie.' },
    MULLIGAN_DONE: (p) => ({
        vous: 'Vous avez fait un mulligan.',
        named: `${p.player} a fait un mulligan.`,
    }),
    MULLIGAN_KEPT: (p) => ({
        vous: 'Vous avez gardé votre main.',
        named: `${p.player} a gardé sa main.`,
    }),
    BID_PLACED: (p) => ({
        vous: `Vous avez misé ${p.bid}.`,
        named: `${p.player} a misé ${p.bid}.`,
    }),
    BID_WON: (p) => ({
        vous: 'Vous gagnez l’enchère.',
        named: `${p.player} gagne l’enchère.`,
    }),
    ABILITY_USED_CHARACTER: (p) => ({
        named: `${p.card} a utilisé une compétence.`,
    }),
    ABILITY_USED_SUPPORT: (p) => ({
        named: `${p.card} a été utilisé.`,
    }),
    ABILITY_USED_ATTACHED: (p) => ({
        named: `${p.bearer} a utilisé ${p.card}.`,
    }),
    DISCARDED_HAND: (p) => ({
        vous: `Vous avez défaussé ${p.card}.`,
        named: `${p.player} a défaussé ${p.card}.`,
    }),
};

const en: Record<JournalKey, Template> = {
    PHASE: (p) => ({
        named: `${phaseLabel.en[String(p.phaseKey)] || p.phaseKey} phase`,
    }),
    PLAYED_CARD: (p) => ({
        vous: `You played ${p.card}.`,
        named: `${p.player} played ${p.card}.`,
    }),
    DISCARDED_FROM_PLAY: (p) => ({
        named: `${p.card} is discarded.`,
    }),
    WOUND_TAKEN: (p) => ({
        named: `${p.card} takes ${woundsPhrase('en', Number(p.count) || 1)}${woundVia('en', p.source)}.`,
    }),
    WOUND_TAKEN_DIED: (p) => ({
        named: `${p.card} takes ${woundsPhrase('en', Number(p.count) || 1)}${woundVia('en', p.source)} and dies.`,
    }),
    HEALED: (p) => ({
        named:
            Number(p.count) > 1
                ? `${p.card} is healed (${woundsPhrase('en', Number(p.count))}).`
                : `${p.card} is healed.`,
    }),
    MOVED_TO_SITE: (p) => ({
        named: `The fellowship moves to site ${p.siteNumber}: ${p.siteName}.`,
    }),
    DECIDED_STOP: (p) => ({
        vous: 'You decided to stop.',
        named: `${p.player} decided to stop.`,
    }),
    DECIDED_MOVE_AGAIN: (p) => ({
        vous: 'You decided to move again.',
        named: `${p.player} decided to move again.`,
    }),
    SIDE_FREE_PEOPLES: (p) => ({
        vous: `${p.prefix || ''}You play Free Peoples.`.trim(),
        named: `${p.prefix || ''}${p.player} plays Free Peoples.`.trim(),
    }),
    SIDE_SHADOW: (p) => ({
        vous: 'You play Shadow.',
        named: `${p.player} plays Shadow.`,
    }),
    SETUP_COMPLETE: { named: 'Setup complete. The game begins.' },
    MULLIGAN_DONE: (p) => ({
        vous: 'You mulliganed.',
        named: `${p.player} mulliganed.`,
    }),
    MULLIGAN_KEPT: (p) => ({
        vous: 'You kept your hand.',
        named: `${p.player} kept their hand.`,
    }),
    BID_PLACED: (p) => ({
        vous: `You bid ${p.bid}.`,
        named: `${p.player} bid ${p.bid}.`,
    }),
    BID_WON: (p) => ({
        vous: 'You win the auction.',
        named: `${p.player} wins the auction.`,
    }),
    ABILITY_USED_CHARACTER: (p) => ({
        named: `${p.card} used an ability.`,
    }),
    ABILITY_USED_SUPPORT: (p) => ({
        named: `${p.card} was used.`,
    }),
    ABILITY_USED_ATTACHED: (p) => ({
        named: `${p.bearer} used ${p.card}.`,
    }),
    DISCARDED_HAND: (p) => ({
        vous: `You discarded ${p.card}.`,
        named: `${p.player} discarded ${p.card}.`,
    }),
};

const de: Record<JournalKey, Template> = {
    PHASE: (p) => ({
        named: `Phase ${phaseLabel.de[String(p.phaseKey)] || p.phaseKey}`,
    }),
    PLAYED_CARD: (p) => ({
        vous: `Du hast ${p.card} gespielt.`,
        named: `${p.player} hat ${p.card} gespielt.`,
    }),
    DISCARDED_FROM_PLAY: (p) => ({
        named: `${p.card} wird abgelegt.`,
    }),
    WOUND_TAKEN: (p) => ({
        named: `${p.card} erhält ${woundsPhrase('de', Number(p.count) || 1)}${woundVia('de', p.source)}.`,
    }),
    WOUND_TAKEN_DIED: (p) => ({
        named: `${p.card} erhält ${woundsPhrase('de', Number(p.count) || 1)}${woundVia('de', p.source)} und stirbt.`,
    }),
    HEALED: (p) => ({
        named:
            Number(p.count) > 1
                ? `${p.card} wird geheilt (${woundsPhrase('de', Number(p.count))}).`
                : `${p.card} wird geheilt.`,
    }),
    MOVED_TO_SITE: (p) => ({
        named: `Die Gemeinschaft zieht zum Ort ${p.siteNumber}: ${p.siteName}.`,
    }),
    DECIDED_STOP: (p) => ({
        vous: 'Du hast dich entschieden anzuhalten.',
        named: `${p.player} hat sich entschieden anzuhalten.`,
    }),
    DECIDED_MOVE_AGAIN: (p) => ({
        vous: 'Du hast dich entschieden weiterzuziehen.',
        named: `${p.player} hat sich entschieden weiterzuziehen.`,
    }),
    SIDE_FREE_PEOPLES: (p) => ({
        vous: `${p.prefix || ''}Du spielst die Freien Völker.`.trim(),
        named: `${p.prefix || ''}${p.player} spielt die Freien Völker.`.trim(),
    }),
    SIDE_SHADOW: (p) => ({
        vous: 'Du spielst Schatten.',
        named: `${p.player} spielt Schatten.`,
    }),
    SETUP_COMPLETE: {
        named: 'Vorbereitung abgeschlossen. Das Spiel beginnt.',
    },
    MULLIGAN_DONE: (p) => ({
        vous: 'Du hast gemulligant.',
        named: `${p.player} hat gemulligant.`,
    }),
    MULLIGAN_KEPT: (p) => ({
        vous: 'Du hast deine Hand behalten.',
        named: `${p.player} hat die Hand behalten.`,
    }),
    BID_PLACED: (p) => ({
        vous: `Du hast ${p.bid} geboten.`,
        named: `${p.player} hat ${p.bid} geboten.`,
    }),
    BID_WON: (p) => ({
        vous: 'Du gewinnst die Auktion.',
        named: `${p.player} gewinnt die Auktion.`,
    }),
    ABILITY_USED_CHARACTER: (p) => ({
        named: `${p.card} hat eine Fähigkeit benutzt.`,
    }),
    ABILITY_USED_SUPPORT: (p) => ({
        named: `${p.card} wurde benutzt.`,
    }),
    ABILITY_USED_ATTACHED: (p) => ({
        named: `${p.bearer} hat ${p.card} benutzt.`,
    }),
    DISCARDED_HAND: (p) => ({
        vous: `Du hast ${p.card} abgelegt.`,
        named: `${p.player} hat ${p.card} abgelegt.`,
    }),
};

const it: Record<JournalKey, Template> = {
    PHASE: (p) => ({
        named: `Fase ${phaseLabel.it[String(p.phaseKey)] || p.phaseKey}`,
    }),
    PLAYED_CARD: (p) => ({
        vous: `Hai giocato ${p.card}.`,
        named: `${p.player} ha giocato ${p.card}.`,
    }),
    DISCARDED_FROM_PLAY: (p) => ({
        named: `${p.card} viene scartato.`,
    }),
    WOUND_TAKEN: (p) => ({
        named: `${p.card} subisce ${woundsPhrase('it', Number(p.count) || 1)}${woundVia('it', p.source)}.`,
    }),
    WOUND_TAKEN_DIED: (p) => ({
        named: `${p.card} subisce ${woundsPhrase('it', Number(p.count) || 1)}${woundVia('it', p.source)} e muore.`,
    }),
    HEALED: (p) => ({
        named:
            Number(p.count) > 1
                ? `${p.card} viene curato (${woundsPhrase('it', Number(p.count))}).`
                : `${p.card} viene curato.`,
    }),
    MOVED_TO_SITE: (p) => ({
        named: `La Compagnia avanza al sito ${p.siteNumber}: ${p.siteName}.`,
    }),
    DECIDED_STOP: (p) => ({
        vous: 'Hai deciso di fermarti.',
        named: `${p.player} ha deciso di fermarsi.`,
    }),
    DECIDED_MOVE_AGAIN: (p) => ({
        vous: 'Hai deciso di avanzare di nuovo.',
        named: `${p.player} ha deciso di avanzare di nuovo.`,
    }),
    SIDE_FREE_PEOPLES: (p) => ({
        vous: `${p.prefix || ''}Giochi i Popoli Liberi.`.trim(),
        named: `${p.prefix || ''}${p.player} gioca i Popoli Liberi.`.trim(),
    }),
    SIDE_SHADOW: (p) => ({
        vous: 'Giochi Ombra.',
        named: `${p.player} gioca Ombra.`,
    }),
    SETUP_COMPLETE: {
        named: 'Preparazione completata. Inizia la partita.',
    },
    MULLIGAN_DONE: (p) => ({
        vous: 'Hai fatto mulligan.',
        named: `${p.player} ha fatto mulligan.`,
    }),
    MULLIGAN_KEPT: (p) => ({
        vous: 'Hai tenuto la mano.',
        named: `${p.player} ha tenuto la mano.`,
    }),
    BID_PLACED: (p) => ({
        vous: `Hai puntato ${p.bid}.`,
        named: `${p.player} ha puntato ${p.bid}.`,
    }),
    BID_WON: (p) => ({
        vous: 'Vinci l’asta.',
        named: `${p.player} vince l’asta.`,
    }),
    ABILITY_USED_CHARACTER: (p) => ({
        named: `${p.card} ha usato un’abilità.`,
    }),
    ABILITY_USED_SUPPORT: (p) => ({
        named: `${p.card} è stato usato.`,
    }),
    ABILITY_USED_ATTACHED: (p) => ({
        named: `${p.bearer} ha usato ${p.card}.`,
    }),
    DISCARDED_HAND: (p) => ({
        vous: `Hai scartato ${p.card}.`,
        named: `${p.player} ha scartato ${p.card}.`,
    }),
};

const es: Record<JournalKey, Template> = {
    PHASE: (p) => ({
        named: `Fase de ${phaseLabel.es[String(p.phaseKey)] || p.phaseKey}`,
    }),
    PLAYED_CARD: (p) => ({
        vous: `Has jugado ${p.card}.`,
        named: `${p.player} jugó ${p.card}.`,
    }),
    DISCARDED_FROM_PLAY: (p) => ({
        named: `${p.card} se descarta.`,
    }),
    WOUND_TAKEN: (p) => ({
        named: `${p.card} recibe ${woundsPhrase('es', Number(p.count) || 1)}${woundVia('es', p.source)}.`,
    }),
    WOUND_TAKEN_DIED: (p) => ({
        named: `${p.card} recibe ${woundsPhrase('es', Number(p.count) || 1)}${woundVia('es', p.source)} y muere.`,
    }),
    HEALED: (p) => ({
        named:
            Number(p.count) > 1
                ? `${p.card} es curado (${woundsPhrase('es', Number(p.count))}).`
                : `${p.card} es curado.`,
    }),
    MOVED_TO_SITE: (p) => ({
        named: `La compañía avanza al sitio ${p.siteNumber}: ${p.siteName}.`,
    }),
    DECIDED_STOP: (p) => ({
        vous: 'Has decidido detenerte.',
        named: `${p.player} ha decidido detenerse.`,
    }),
    DECIDED_MOVE_AGAIN: (p) => ({
        vous: 'Has decidido avanzar de nuevo.',
        named: `${p.player} ha decidido avanzar de nuevo.`,
    }),
    SIDE_FREE_PEOPLES: (p) => ({
        vous: `${p.prefix || ''}Juegas Pueblos Libres.`.trim(),
        named: `${p.prefix || ''}${p.player} juega Pueblos Libres.`.trim(),
    }),
    SIDE_SHADOW: (p) => ({
        vous: 'Juegas Sombra.',
        named: `${p.player} juega Sombra.`,
    }),
    SETUP_COMPLETE: {
        named: 'Preparación terminada. Empieza la partida.',
    },
    MULLIGAN_DONE: (p) => ({
        vous: 'Has hecho mulligan.',
        named: `${p.player} hizo mulligan.`,
    }),
    MULLIGAN_KEPT: (p) => ({
        vous: 'Has conservado tu mano.',
        named: `${p.player} conservó su mano.`,
    }),
    BID_PLACED: (p) => ({
        vous: `Has pujado ${p.bid}.`,
        named: `${p.player} pujó ${p.bid}.`,
    }),
    BID_WON: (p) => ({
        vous: 'Ganas la subasta.',
        named: `${p.player} gana la subasta.`,
    }),
    ABILITY_USED_CHARACTER: (p) => ({
        named: `${p.card} usó una habilidad.`,
    }),
    ABILITY_USED_SUPPORT: (p) => ({
        named: `${p.card} fue usado.`,
    }),
    ABILITY_USED_ATTACHED: (p) => ({
        named: `${p.bearer} usó ${p.card}.`,
    }),
    DISCARDED_HAND: (p) => ({
        vous: `Has descartado ${p.card}.`,
        named: `${p.player} descartó ${p.card}.`,
    }),
};

export const JOURNAL_CATALOG: Record<
    SupportedLanguage,
    Record<JournalKey, Template>
> = { fr, en, de, it, es };

export function formatJournalNotice(
    lang: SupportedLanguage,
    key: JournalKey,
    params: JournalParams = {}
): JournalForms {
    const template =
        JOURNAL_CATALOG[lang]?.[key] ?? JOURNAL_CATALOG.fr[key];
    if (!template) return { named: '' };
    return typeof template === 'function' ? template(params) : template;
}
