import type { SupportedLanguage } from '../languages';
import type { JournalForms, JournalKey, JournalParams } from './types';

type Template = JournalForms | ((p: JournalParams) => JournalForms);

const PHASE: Record<SupportedLanguage, Record<string, string>> = {
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

const STAT: Record<SupportedLanguage, Record<string, string>> = {
    fr: {
        STRENGTH: 'force',
        VITALITY: 'vitalité',
        RESISTANCE: 'résistance',
        TWILIGHT_COST: 'crépuscule',
    },
    en: {
        STRENGTH: 'strength',
        VITALITY: 'vitality',
        RESISTANCE: 'resistance',
        TWILIGHT_COST: 'twilight',
    },
    de: {
        STRENGTH: 'Stärke',
        VITALITY: 'Vitalität',
        RESISTANCE: 'Widerstand',
        TWILIGHT_COST: 'Einfluss',
    },
    it: {
        STRENGTH: 'forza',
        VITALITY: 'vitalità',
        RESISTANCE: 'resistenza',
        TWILIGHT_COST: 'crepuscolo',
    },
    es: {
        STRENGTH: 'fuerza',
        VITALITY: 'vitalidad',
        RESISTANCE: 'resistencia',
        TWILIGHT_COST: 'crepúsculo',
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

function minionWord(lang: SupportedLanguage, count: number): string {
    const n = Math.max(0, Math.floor(Number(count) || 0));
    if (lang === 'fr') return n <= 1 ? 'séide' : 'séides';
    if (lang === 'en') return n <= 1 ? 'minion' : 'minions';
    if (lang === 'de') return 'Diener';
    if (lang === 'it') return n <= 1 ? 'servitore' : 'servitori';
    return n <= 1 ? 'esbirro' : 'esbirros';
}

function catalogFor(lang: SupportedLanguage): Record<JournalKey, Template> {
    const ph = PHASE[lang];
    const st = STAT[lang];

    return {
        PHASE: (p) => ({
            named:
                lang === 'en'
                    ? `${ph[String(p.phaseKey)] || p.phaseKey} phase`
                    : lang === 'es'
                      ? `Fase de ${ph[String(p.phaseKey)] || p.phaseKey}`
                      : lang === 'it'
                        ? `Fase ${ph[String(p.phaseKey)] || p.phaseKey}`
                        : `Phase ${ph[String(p.phaseKey)] || p.phaseKey}`,
        }),
        PLAYED_CARD: (p) =>
            ({
                fr: {
                    vous: `Vous avez joué ${p.card}.`,
                    named: `${p.player} a joué ${p.card}.`,
                },
                en: {
                    vous: `You played ${p.card}.`,
                    named: `${p.player} played ${p.card}.`,
                },
                de: {
                    vous: `Du hast ${p.card} gespielt.`,
                    named: `${p.player} hat ${p.card} gespielt.`,
                },
                it: {
                    vous: `Hai giocato ${p.card}.`,
                    named: `${p.player} ha giocato ${p.card}.`,
                },
                es: {
                    vous: `Has jugado ${p.card}.`,
                    named: `${p.player} jugó ${p.card}.`,
                },
            })[lang],
        DISCARDED_FROM_PLAY: (p) =>
            ({
                fr: { named: `${p.card} est défaussé.` },
                en: { named: `${p.card} is discarded.` },
                de: { named: `${p.card} wird abgelegt.` },
                it: { named: `${p.card} viene scartato.` },
                es: { named: `${p.card} se descarta.` },
            })[lang],
        WOUND_TAKEN: (p) => ({
            named: `${p.card} ${
                (
                    {
                        fr: 'prend',
                        en: 'takes',
                        de: 'erhält',
                        it: 'subisce',
                        es: 'recibe',
                    } as const
                )[lang]
            } ${woundsPhrase(lang, Number(p.count) || 1)}${woundVia(lang, p.source)}.`,
        }),
        WOUND_TAKEN_DIED: (p) => ({
            named: `${p.card} ${
                (
                    {
                        fr: 'prend',
                        en: 'takes',
                        de: 'erhält',
                        it: 'subisce',
                        es: 'recibe',
                    } as const
                )[lang]
            } ${woundsPhrase(lang, Number(p.count) || 1)}${woundVia(lang, p.source)} ${
                (
                    {
                        fr: 'et meurt',
                        en: 'and dies',
                        de: 'und stirbt',
                        it: 'e muore',
                        es: 'y muere',
                    } as const
                )[lang]
            }.`,
        }),
        HEALED: (p) => {
            const multi = Number(p.count) > 1;
            return {
                named: (
                    {
                        fr: multi
                            ? `${p.card} est soigné (${woundsPhrase(lang, Number(p.count))}).`
                            : `${p.card} est soigné.`,
                        en: multi
                            ? `${p.card} is healed (${woundsPhrase(lang, Number(p.count))}).`
                            : `${p.card} is healed.`,
                        de: multi
                            ? `${p.card} wird geheilt (${woundsPhrase(lang, Number(p.count))}).`
                            : `${p.card} wird geheilt.`,
                        it: multi
                            ? `${p.card} viene curato (${woundsPhrase(lang, Number(p.count))}).`
                            : `${p.card} viene curato.`,
                        es: multi
                            ? `${p.card} es curado (${woundsPhrase(lang, Number(p.count))}).`
                            : `${p.card} es curado.`,
                    } as const
                )[lang],
            };
        },
        MOVED_TO_SITE: (p) =>
            ({
                fr: {
                    named: `La compagnie avance au site ${p.siteNumber} : ${p.siteName}.`,
                },
                en: {
                    named: `The fellowship moves to site ${p.siteNumber}: ${p.siteName}.`,
                },
                de: {
                    named: `Die Gemeinschaft zieht zum Ort ${p.siteNumber}: ${p.siteName}.`,
                },
                it: {
                    named: `La Compagnia avanza al sito ${p.siteNumber}: ${p.siteName}.`,
                },
                es: {
                    named: `La compañía avanza al sitio ${p.siteNumber}: ${p.siteName}.`,
                },
            })[lang],
        DECIDED_STOP: (p) =>
            ({
                fr: {
                    vous: 'Vous avez décidé de vous arrêter.',
                    named: `${p.player} a décidé de s’arrêter.`,
                },
                en: {
                    vous: 'You decided to stop.',
                    named: `${p.player} decided to stop.`,
                },
                de: {
                    vous: 'Du hast dich entschieden anzuhalten.',
                    named: `${p.player} hat sich entschieden anzuhalten.`,
                },
                it: {
                    vous: 'Hai deciso di fermarti.',
                    named: `${p.player} ha deciso di fermarsi.`,
                },
                es: {
                    vous: 'Has decidido detenerte.',
                    named: `${p.player} ha decidido detenerse.`,
                },
            })[lang],
        DECIDED_MOVE_AGAIN: (p) =>
            ({
                fr: {
                    vous: 'Vous avez décidé d’avancer de nouveau.',
                    named: `${p.player} a décidé d’avancer de nouveau.`,
                },
                en: {
                    vous: 'You decided to move again.',
                    named: `${p.player} decided to move again.`,
                },
                de: {
                    vous: 'Du hast dich entschieden weiterzuziehen.',
                    named: `${p.player} hat sich entschieden weiterzuziehen.`,
                },
                it: {
                    vous: 'Hai deciso di avanzare di nuovo.',
                    named: `${p.player} ha deciso di avanzare di nuovo.`,
                },
                es: {
                    vous: 'Has decidido avanzar de nuevo.',
                    named: `${p.player} ha decidido avanzar de nuevo.`,
                },
            })[lang],
        SIDE_FREE_PEOPLES: (p) => {
            const prefixes = {
                fr: 'Nouveau tour ! ',
                en: 'New turn! ',
                de: 'Neuer Zug! ',
                it: 'Nuovo turno! ',
                es: '¡Nuevo turno! ',
            };
            const prefix =
                p.prefixKey === 'newTurn' ? prefixes[lang] : '';
            return {
                fr: {
                    vous: `${prefix}Vous jouez les Peuples Libres.`,
                    named: `${prefix}${p.player} joue les Peuples Libres.`,
                },
                en: {
                    vous: `${prefix}You play Free Peoples.`,
                    named: `${prefix}${p.player} plays Free Peoples.`,
                },
                de: {
                    vous: `${prefix}Du spielst die Freien Völker.`,
                    named: `${prefix}${p.player} spielt die Freien Völker.`,
                },
                it: {
                    vous: `${prefix}Giochi i Popoli Liberi.`,
                    named: `${prefix}${p.player} gioca i Popoli Liberi.`,
                },
                es: {
                    vous: `${prefix}Juegas Pueblos Libres.`,
                    named: `${prefix}${p.player} juega Pueblos Libres.`,
                },
            }[lang];
        },
        SIDE_SHADOW: (p) =>
            ({
                fr: {
                    vous: 'Vous jouez l’Ombre.',
                    named: `${p.player} joue l’Ombre.`,
                },
                en: {
                    vous: 'You play Shadow.',
                    named: `${p.player} plays Shadow.`,
                },
                de: {
                    vous: 'Du spielst Schatten.',
                    named: `${p.player} spielt Schatten.`,
                },
                it: {
                    vous: 'Giochi Ombra.',
                    named: `${p.player} gioca Ombra.`,
                },
                es: {
                    vous: 'Juegas Sombra.',
                    named: `${p.player} juega Sombra.`,
                },
            })[lang],
        SETUP_COMPLETE: {
            named: (
                {
                    fr: 'Mise en place terminée. Début de la partie.',
                    en: 'Setup complete. The game begins.',
                    de: 'Vorbereitung abgeschlossen. Das Spiel beginnt.',
                    it: 'Preparazione completata. Inizia la partita.',
                    es: 'Preparación terminada. Empieza la partida.',
                } as const
            )[lang],
        },
        MULLIGAN_DONE: (p) =>
            ({
                fr: {
                    vous: 'Vous avez fait un mulligan.',
                    named: `${p.player} a fait un mulligan.`,
                },
                en: {
                    vous: 'You mulliganed.',
                    named: `${p.player} mulliganed.`,
                },
                de: {
                    vous: 'Du hast gemulligant.',
                    named: `${p.player} hat gemulligant.`,
                },
                it: {
                    vous: 'Hai fatto mulligan.',
                    named: `${p.player} ha fatto mulligan.`,
                },
                es: {
                    vous: 'Has hecho mulligan.',
                    named: `${p.player} hizo mulligan.`,
                },
            })[lang],
        MULLIGAN_KEPT: (p) =>
            ({
                fr: {
                    vous: 'Vous avez gardé votre main.',
                    named: `${p.player} a gardé sa main.`,
                },
                en: {
                    vous: 'You kept your hand.',
                    named: `${p.player} kept their hand.`,
                },
                de: {
                    vous: 'Du hast deine Hand behalten.',
                    named: `${p.player} hat die Hand behalten.`,
                },
                it: {
                    vous: 'Hai tenuto la mano.',
                    named: `${p.player} ha tenuto la mano.`,
                },
                es: {
                    vous: 'Has conservado tu mano.',
                    named: `${p.player} conservó su mano.`,
                },
            })[lang],
        BID_PLACED: (p) =>
            ({
                fr: {
                    vous: `Vous avez misé ${p.bid}.`,
                    named: `${p.player} a misé ${p.bid}.`,
                },
                en: {
                    vous: `You bid ${p.bid}.`,
                    named: `${p.player} bid ${p.bid}.`,
                },
                de: {
                    vous: `Du hast ${p.bid} geboten.`,
                    named: `${p.player} hat ${p.bid} geboten.`,
                },
                it: {
                    vous: `Hai puntato ${p.bid}.`,
                    named: `${p.player} ha puntato ${p.bid}.`,
                },
                es: {
                    vous: `Has pujado ${p.bid}.`,
                    named: `${p.player} pujó ${p.bid}.`,
                },
            })[lang],
        BID_WON: (p) =>
            ({
                fr: {
                    vous: 'Vous gagnez l’enchère.',
                    named: `${p.player} gagne l’enchère.`,
                },
                en: {
                    vous: 'You win the auction.',
                    named: `${p.player} wins the auction.`,
                },
                de: {
                    vous: 'Du gewinnst die Auktion.',
                    named: `${p.player} gewinnt die Auktion.`,
                },
                it: {
                    vous: 'Vinci l’asta.',
                    named: `${p.player} vince l’asta.`,
                },
                es: {
                    vous: 'Ganas la subasta.',
                    named: `${p.player} gana la subasta.`,
                },
            })[lang],
        ABILITY_USED_CHARACTER: (p) =>
            ({
                fr: { named: `${p.card} a utilisé une compétence.` },
                en: { named: `${p.card} used an ability.` },
                de: { named: `${p.card} hat eine Fähigkeit benutzt.` },
                it: { named: `${p.card} ha usato un’abilità.` },
                es: { named: `${p.card} usó una habilidad.` },
            })[lang],
        ABILITY_USED_SUPPORT: (p) =>
            ({
                fr: { named: `${p.card} a été utilisé.` },
                en: { named: `${p.card} was used.` },
                de: { named: `${p.card} wurde benutzt.` },
                it: { named: `${p.card} è stato usato.` },
                es: { named: `${p.card} fue usado.` },
            })[lang],
        ABILITY_USED_ATTACHED: (p) =>
            ({
                fr: { named: `${p.bearer} a utilisé ${p.card}.` },
                en: { named: `${p.bearer} used ${p.card}.` },
                de: { named: `${p.bearer} hat ${p.card} benutzt.` },
                it: { named: `${p.bearer} ha usato ${p.card}.` },
                es: { named: `${p.bearer} usó ${p.card}.` },
            })[lang],
        ABILITY_EXERT_BUFF_TARGET: (p) => {
            const stat =
                st[String(p.stat)] || String(p.stat || '').toLowerCase();
            const bonus = `${p.sign ?? ''}${p.value}`;
            return (
                {
                    fr: {
                        named: `${p.source} s’est affaibli pour donner ${bonus} en ${stat} à ${p.target}.`,
                    },
                    en: {
                        named: `${p.source} exerted to give ${bonus} ${stat} to ${p.target}.`,
                    },
                    de: {
                        named: `${p.source} hat sich angestrengt, um ${p.target} ${bonus} ${stat} zu geben.`,
                    },
                    it: {
                        named: `${p.source} si è affaticato per dare ${bonus} di ${stat} a ${p.target}.`,
                    },
                    es: {
                        named: `${p.source} se agotó para dar ${bonus} de ${stat} a ${p.target}.`,
                    },
                } as const
            )[lang];
        },
        ABILITY_EXERT_FOR_EFFECT: (p) =>
            ({
                fr: {
                    named: `${p.source} s’est affaibli pour ${p.effect}.`,
                },
                en: {
                    named: `${p.source} exerted to ${p.effect}.`,
                },
                de: {
                    named: `${p.source} hat sich angestrengt, um ${p.effect}.`,
                },
                it: {
                    named: `${p.source} si è affaticato per ${p.effect}.`,
                },
                es: {
                    named: `${p.source} se agotó para ${p.effect}.`,
                },
            })[lang],
        DISCARDED_HAND: (p) =>
            ({
                fr: {
                    vous: `Vous avez défaussé ${p.card}.`,
                    named: `${p.player} a défaussé ${p.card}.`,
                },
                en: {
                    vous: `You discarded ${p.card}.`,
                    named: `${p.player} discarded ${p.card}.`,
                },
                de: {
                    vous: `Du hast ${p.card} abgelegt.`,
                    named: `${p.player} hat ${p.card} abgelegt.`,
                },
                it: {
                    vous: `Hai scartato ${p.card}.`,
                    named: `${p.player} ha scartato ${p.card}.`,
                },
                es: {
                    vous: `Has descartado ${p.card}.`,
                    named: `${p.player} descartó ${p.card}.`,
                },
            })[lang],
        DISCARDED_HAND_MUSTER: (p) =>
            ({
                fr: {
                    vous: `Vous avez défaussé ${p.card} (ralliement ${p.discarded}/${p.allowed}).`,
                    named: `${p.player} a défaussé ${p.card} (ralliement ${p.discarded}/${p.allowed}).`,
                },
                en: {
                    vous: `You discarded ${p.card} (muster ${p.discarded}/${p.allowed}).`,
                    named: `${p.player} discarded ${p.card} (muster ${p.discarded}/${p.allowed}).`,
                },
                de: {
                    vous: `Du hast ${p.card} abgelegt (Muster ${p.discarded}/${p.allowed}).`,
                    named: `${p.player} hat ${p.card} abgelegt (Muster ${p.discarded}/${p.allowed}).`,
                },
                it: {
                    vous: `Hai scartato ${p.card} (raduno ${p.discarded}/${p.allowed}).`,
                    named: `${p.player} ha scartato ${p.card} (raduno ${p.discarded}/${p.allowed}).`,
                },
                es: {
                    vous: `Has descartado ${p.card} (reclutamiento ${p.discarded}/${p.allowed}).`,
                    named: `${p.player} descartó ${p.card} (reclutamiento ${p.discarded}/${p.allowed}).`,
                },
            })[lang],
        MUSTER_VALIDATED: (p) =>
            ({
                fr: {
                    vous: 'Vous avez validé votre ralliement.',
                    named: `${p.player} a validé son ralliement.`,
                },
                en: {
                    vous: 'You confirmed your muster.',
                    named: `${p.player} confirmed their muster.`,
                },
                de: {
                    vous: 'Du hast dein Muster bestätigt.',
                    named: `${p.player} hat das Muster bestätigt.`,
                },
                it: {
                    vous: 'Hai confermato il raduno.',
                    named: `${p.player} ha confermato il raduno.`,
                },
                es: {
                    vous: 'Has validado tu reclutamiento.',
                    named: `${p.player} validó su reclutamiento.`,
                },
            })[lang],
        SKIRMISH_WON: (p) =>
            ({
                fr: { named: `${p.winner} a vaincu ${p.loser}.` },
                en: { named: `${p.winner} defeated ${p.loser}.` },
                de: { named: `${p.winner} hat ${p.loser} besiegt.` },
                it: { named: `${p.winner} ha sconfitto ${p.loser}.` },
                es: { named: `${p.winner} derrotó a ${p.loser}.` },
            })[lang],
        SKIRMISH_WON_PLURAL: (p) =>
            ({
                fr: { named: `${p.winner} ont vaincu ${p.loser}.` },
                en: { named: `${p.winner} defeated ${p.loser}.` },
                de: { named: `${p.winner} haben ${p.loser} besiegt.` },
                it: { named: `${p.winner} hanno sconfitto ${p.loser}.` },
                es: { named: `${p.winner} derrotaron a ${p.loser}.` },
            })[lang],
        OVERWHELMED_DIED: (p) =>
            ({
                fr: { named: `${p.card} est submergé et meurt.` },
                en: { named: `${p.card} is overwhelmed and dies.` },
                de: { named: `${p.card} wird überwältigt und stirbt.` },
                it: { named: `${p.card} viene sopraffatto e muore.` },
                es: { named: `${p.card} es abrumado y muere.` },
            })[lang],
        RING_BURDENS_INSTEAD: (p) =>
            ({
                fr: {
                    named: `${p.card} porte l’Anneau Unique : ${p.bid} à la place.`,
                },
                en: {
                    named: `${p.card} wears the One Ring: ${p.bid} instead.`,
                },
                de: {
                    named: `${p.card} trägt den Einen Ring: ${p.bid} statt dessen.`,
                },
                it: {
                    named: `${p.card} indossa l’Unico Anello: ${p.bid} al posto.`,
                },
                es: {
                    named: `${p.card} lleva el Anillo Único: ${p.bid} en su lugar.`,
                },
            })[lang],
        ASSIGNED: (p) =>
            ({
                fr: { named: `${p.minion} est assigné à ${p.companion}.` },
                en: { named: `${p.minion} is assigned to ${p.companion}.` },
                de: {
                    named: `${p.minion} wird ${p.companion} zugewiesen.`,
                },
                it: {
                    named: `${p.minion} è assegnato a ${p.companion}.`,
                },
                es: {
                    named: `${p.minion} es asignado a ${p.companion}.`,
                },
            })[lang],
        ASSIGNED_AMBUSH: (p) =>
            ({
                fr: {
                    named: `${p.minion} est assigné à ${p.companion}. Embuscade : +${p.twilight} crépuscule.`,
                },
                en: {
                    named: `${p.minion} is assigned to ${p.companion}. Ambush: +${p.twilight} twilight.`,
                },
                de: {
                    named: `${p.minion} wird ${p.companion} zugewiesen. Hinterhalt: +${p.twilight} Einfluss.`,
                },
                it: {
                    named: `${p.minion} è assegnato a ${p.companion}. Imboscata: +${p.twilight} crepuscolo.`,
                },
                es: {
                    named: `${p.minion} es asignado a ${p.companion}. Emboscada: +${p.twilight} crepúsculo.`,
                },
            })[lang],
        ASSIGNED_STRENGTH: (p) =>
            ({
                fr: {
                    named: `${p.minion} est assigné à ${p.companion} (force +${p.bonus} jusqu’au regroupement).`,
                },
                en: {
                    named: `${p.minion} is assigned to ${p.companion} (strength +${p.bonus} until regroup).`,
                },
                de: {
                    named: `${p.minion} wird ${p.companion} zugewiesen (Stärke +${p.bonus} bis zum Sammeln).`,
                },
                it: {
                    named: `${p.minion} è assegnato a ${p.companion} (forza +${p.bonus} fino al raduno).`,
                },
                es: {
                    named: `${p.minion} es asignado a ${p.companion} (fuerza +${p.bonus} hasta la reagrupación).`,
                },
            })[lang],
        YIELD_ASSIGNMENT_TO_SHADOW: {
            named: (
                {
                    fr: 'Les Peuples Libres laissent l’Ombre affecter les séides restants.',
                    en: 'Free Peoples let Shadow assign the remaining minions.',
                    de: 'Die Freien Völker lassen den Schatten die restlichen Diener zuweisen.',
                    it: 'I Popoli Liberi lasciano all’Ombra assegnare i servitori restanti.',
                    es: 'Los Pueblos Libres dejan que la Sombra asigne los esbirros restantes.',
                } as const
            )[lang],
        },
        SHADOW_LEFT_UNASSIGNED: (p) => {
            const n = Number(p.count) || 0;
            const word = minionWord(lang, n);
            return {
                named: (
                    {
                        fr: `L’Ombre laisse ${n} ${word} hors combat.`,
                        en: `Shadow leaves ${n} ${word} out of skirmishes.`,
                        de: `Schatten lässt ${n} ${word} außerhalb des Kampfes.`,
                        it: `L’Ombra lascia ${n} ${word} fuori combattimento.`,
                        es: `La Sombra deja ${n} ${word} fuera de combate.`,
                    } as const
                )[lang],
            };
        },
        ASSIGNMENT_DONE: {
            named: (
                {
                    fr: 'Affectation terminée.',
                    en: 'Assignment finished.',
                    de: 'Zuweisung beendet.',
                    it: 'Assegnazione terminata.',
                    es: 'Asignación terminada.',
                } as const
            )[lang],
        },
        SKIRMISH_CANCELLED: (p) =>
            ({
                fr: { named: `Combat annulé (${p.card}).` },
                en: { named: `Skirmish cancelled (${p.card}).` },
                de: { named: `Kampf abgebrochen (${p.card}).` },
                it: { named: `Combattimento annullato (${p.card}).` },
                es: { named: `Combate cancelado (${p.card}).` },
            })[lang],
        GAME_WON: (p) => {
            const name = String(p.ringBearer || 'Le Porteur');
            const female = Boolean(p.female);
            const details = {
                fr:
                    p.reason === 'SITE_NINE'
                        ? female
                            ? `${name}, aidée de ses compagnons, a détruit l’Anneau de Sauron.`
                            : `${name}, aidé de ses compagnons, a détruit l’Anneau de Sauron.`
                        : p.reason === 'CORRUPTION'
                          ? female
                              ? `${name} a été corrompue par la volonté de l’Anneau.`
                              : `${name} a été corrompu par la volonté de l’Anneau.`
                          : `${name} a succombé à ses blessures.`,
                en:
                    p.reason === 'SITE_NINE'
                        ? `${name}, aided by companions, destroyed Sauron’s Ring.`
                        : p.reason === 'CORRUPTION'
                          ? `${name} was corrupted by the will of the Ring.`
                          : `${name} succumbed to wounds.`,
                de:
                    p.reason === 'SITE_NINE'
                        ? `${name} hat mit den Gefährten den Ring Saurons zerstört.`
                        : p.reason === 'CORRUPTION'
                          ? `${name} wurde durch den Willen des Rings verdorben.`
                          : `${name} erlag den Wunden.`,
                it:
                    p.reason === 'SITE_NINE'
                        ? `${name}, con i compagni, ha distrutto l’Anello di Sauron.`
                        : p.reason === 'CORRUPTION'
                          ? female
                              ? `${name} è stata corrotta dalla volontà dell’Anello.`
                              : `${name} è stato corrotto dalla volontà dell’Anello.`
                          : `${name} è soccombuto alle ferite.`,
                es:
                    p.reason === 'SITE_NINE'
                        ? `${name}, con sus compañeros, destruyó el Anillo de Sauron.`
                        : p.reason === 'CORRUPTION'
                          ? female
                              ? `${name} fue corrompida por la voluntad del Anillo.`
                              : `${name} fue corrompido por la voluntad del Anillo.`
                          : `${name} sucumbió a sus heridas.`,
            };
            const detail = details[lang];
            return {
                fr: {
                    vous: `Vous remportez la partie. ${detail}`,
                    named: `${p.player} remporte la partie. ${detail}`,
                },
                en: {
                    vous: `You win the game. ${detail}`,
                    named: `${p.player} wins the game. ${detail}`,
                },
                de: {
                    vous: `Du gewinnst die Partie. ${detail}`,
                    named: `${p.player} gewinnt die Partie. ${detail}`,
                },
                it: {
                    vous: `Vinci la partita. ${detail}`,
                    named: `${p.player} vince la partita. ${detail}`,
                },
                es: {
                    vous: `Ganas la partida. ${detail}`,
                    named: `${p.player} gana la partida. ${detail}`,
                },
            }[lang];
        },
    };
}

export const JOURNAL_CATALOG: Record<
    SupportedLanguage,
    Record<JournalKey, Template>
> = {
    fr: catalogFor('fr'),
    en: catalogFor('en'),
    de: catalogFor('de'),
    it: catalogFor('it'),
    es: catalogFor('es'),
};

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
