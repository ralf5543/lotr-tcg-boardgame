import type { SupportedLanguage } from './languages';
import { getUiMessages } from './ui';

/** Mot « crépuscule » selon la langue d’interface. */
export function twilightTerm(
    lang: SupportedLanguage,
    count = 1
): string {
    const c = getUiMessages(lang).chrome.common;
    return count > 1 ? c.twilights : c.twilight;
}

/**
 * Remplace le mot FR « crépuscule(s) » dans un libellé UI
 * (bulles d’action, etc.) selon la langue d’interface.
 */
export function localizeTwilightWords(
    text: string,
    lang: SupportedLanguage
): string {
    if (!text || lang === 'fr') return text;
    const singular = twilightTerm(lang, 1);
    const plural = twilightTerm(lang, 2);
    return text
        .replace(/crépuscules/gi, plural)
        .replace(/crépuscule/gi, singular);
}

type TermPair = { fr: RegExp; en: string; de: string; it: string; es: string };

/** Termes de règles fréquents dans les consignes encore en FR brut. */
const TERM_TABLE: TermPair[] = [
    {
        fr: /Choisissez/g,
        en: 'Choose',
        de: 'Wähle',
        it: 'Scegli',
        es: 'Elige',
    },
    {
        fr: /choisissez/g,
        en: 'choose',
        de: 'wähle',
        it: 'scegli',
        es: 'elige',
    },
    {
        fr: /points-fardeau/gi,
        en: 'burdens',
        de: 'Lastmarken',
        it: 'fardelli',
        es: 'cargas',
    },
    {
        fr: /point-fardeau/gi,
        en: 'burden',
        de: 'Lastmarke',
        it: 'fardello',
        es: 'carga',
    },
    {
        fr: /fardeaux/gi,
        en: 'burdens',
        de: 'Lastmarken',
        it: 'fardelli',
        es: 'cargas',
    },
    {
        fr: /fardeau/gi,
        en: 'burden',
        de: 'Lastmarke',
        it: 'fardello',
        es: 'carga',
    },
    {
        fr: /blessures/gi,
        en: 'wounds',
        de: 'Wunden',
        it: 'ferite',
        es: 'heridas',
    },
    {
        fr: /blessure/gi,
        en: 'wound',
        de: 'Wunde',
        it: 'ferita',
        es: 'herida',
    },
    {
        fr: /séides/gi,
        en: 'minions',
        de: 'Diener',
        it: 'servitori',
        es: 'esbirros',
    },
    {
        fr: /séide/gi,
        en: 'minion',
        de: 'Diener',
        it: 'servitore',
        es: 'esbirro',
    },
    {
        fr: /compagnons/gi,
        en: 'companions',
        de: 'Gefährten',
        it: 'compagni',
        es: 'compañeros',
    },
    {
        fr: /compagnon/gi,
        en: 'companion',
        de: 'Gefährte',
        it: 'compagno',
        es: 'compañero',
    },
    {
        fr: /Peuples Libres/g,
        en: 'Free Peoples',
        de: 'Freie Völker',
        it: 'Popoli Liberi',
        es: 'Pueblos Libres',
    },
    {
        fr: /\bOmbre\b/g,
        en: 'Shadow',
        de: 'Schatten',
        it: 'Ombra',
        es: 'Sombra',
    },
    {
        fr: /menaces/gi,
        en: 'threats',
        de: 'Bedrohungen',
        it: 'minacce',
        es: 'amenazas',
    },
    {
        fr: /menace/gi,
        en: 'threat',
        de: 'Bedrohung',
        it: 'minaccia',
        es: 'amenaza',
    },
    {
        fr: /affaiblissez/gi,
        en: 'exert',
        de: 'strenge an',
        it: 'affatica',
        es: 'agota',
    },
    {
        fr: /affaiblir/gi,
        en: 'exert',
        de: 'anspannen',
        it: 'affaticare',
        es: 'agotar',
    },
    {
        fr: /blessez/gi,
        en: 'wound',
        de: 'verwunde',
        it: 'ferisci',
        es: 'hiere',
    },
    {
        fr: /blesser/gi,
        en: 'wound',
        de: 'verwunden',
        it: 'ferire',
        es: 'herir',
    },
    {
        fr: /épuiser/gi,
        en: 'exhaust',
        de: 'erschöpfen',
        it: 'esaurire',
        es: 'agotar por completo',
    },
    {
        fr: /défaussez/gi,
        en: 'discard',
        de: 'lege ab',
        it: 'scarta',
        es: 'descarta',
    },
    {
        fr: /défausser/gi,
        en: 'discard',
        de: 'ablegen',
        it: 'scartare',
        es: 'descartar',
    },
    {
        fr: /piocher/gi,
        en: 'draw',
        de: 'ziehen',
        it: 'pescare',
        es: 'robar',
    },
    {
        fr: /soigner/gi,
        en: 'heal',
        de: 'heilen',
        it: 'curare',
        es: 'curar',
    },
    {
        fr: /Porteur de l’Anneau/g,
        en: 'Ring-bearer',
        de: 'Ringträger',
        it: 'Portatore dell’Anello',
        es: 'Portador del Anillo',
    },
    {
        fr: /\bPorteur\b/g,
        en: 'Ring-bearer',
        de: 'Ringträger',
        it: 'Portatore',
        es: 'Portador',
    },
    {
        fr: /désignez/gi,
        en: 'spot',
        de: 'benenne',
        it: 'designa',
        es: 'designa',
    },
    {
        fr: /retirer/gi,
        en: 'remove',
        de: 'entfernen',
        it: 'rimuovere',
        es: 'quitar',
    },
    {
        fr: /ajouter/gi,
        en: 'add',
        de: 'hinzufügen',
        it: 'aggiungere',
        es: 'añadir',
    },
    {
        fr: /jusqu’au regroupement/gi,
        en: 'until regroup',
        de: 'bis zum Sammeln',
        it: 'fino al raduno',
        es: 'hasta la reagrupación',
    },
    {
        fr: /\bforce\b/gi,
        en: 'strength',
        de: 'Stärke',
        it: 'forza',
        es: 'fuerza',
    },
    {
        fr: /\bvitalité\b/gi,
        en: 'vitality',
        de: 'Vitalität',
        it: 'vitalità',
        es: 'vitalidad',
    },
    {
        fr: /\brésistance\b/gi,
        en: 'resistance',
        de: 'Widerstand',
        it: 'resistenza',
        es: 'resistencia',
    },
];

/** Localise termes + crépuscule dans un texte moteur encore en FR. */
export function localizeGameTerms(
    text: string,
    lang: SupportedLanguage
): string {
    if (!text || lang === 'fr') return text;
    let out = localizeTwilightWords(text, lang);
    for (const row of TERM_TABLE) {
        const repl = row[lang];
        out = out.replace(row.fr, repl);
    }
    return out;
}
