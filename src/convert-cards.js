import fs from 'fs';
import path from 'path';

// ============================================================================
// 1. CONFIGURATION DES CHEMINS ET CONSTANTES DU JEU
// ============================================================================

const CSV_PATH = path.join(process.cwd(), 'lotro_card_data.csv'); 
const OUTPUT_CARDS_PATH = path.join(process.cwd(), 'data/cards.json');
const OUTPUT_SITES_PATH = path.join(process.cwd(), 'data/sites.json');

// Phases de jeu reconnues (pour le champ phases)
const GAME_PHASES = new Set([
    'FELLOWSHIP',
    'SHADOW',
    'MANEUVER',
    'ARCHERY',
    'ASSIGNMENT',
    'SKIRMISH',
    'REGROUP',
    'RESPONSE'
]);

// Races de personnages valides (pour l'analyse de l'attachement)
const VALID_RACES = new Set([
    'BALROG', 'CREATURE', 'DWARF', 'ELF', 'ENT', 'HOBBIT', 
    'MAIA', 'MAN', 'NAZGUL', 'ORC', 'SPIDER', 'TROLL', 
    'URUK-HAI', 'WIZARD', 'WRAITH'
]);

// Cultures valides (pour l'analyse de l'attachement via la balise <symbol>)
const VALID_CULTURES = new Set([
    'DUNLAND', 'DWARVEN', 'ELVEN', 'GANDALF', 'GOLLUM', 
    'GONDOR', 'ISENGARD', 'MEN', 'MORIA', 'ORC', 
    'RAIDER', 'RAITH', 'ROHAN', 'SAURON', 'SHIRE', 
    'THE-ONE-RING', 'URUK-HAI'
]);

// Mots-clés de rôle/statut valides (pour l'analyse de l'attachement via <keyword>)
const VALID_KEYWORDS = new Set([
    'ARCHER', 'BESIEGER', 'CORSAIR', 'EASTERLING', 'HUNTER', 
    'KNIGHT', 'RANGER', 'RING-BEARER', 'RING-BOUND', 
    'SOUTHRON', 'VALIANT', 'VILLAGER', 'WARG-RIDER'
]);

// Types de cartes cibles (pour l'analyse de l'attachement)
const VALID_TARGET_TYPES = new Set(['MINION', 'COMPANION', 'ALLY']);

// Dictionnaire global des termes reconnus pour l'extraction automatique de attachedTo
const KNOWN_ATTACHED_KEYWORDS = Array.from(new Set([
    ...VALID_RACES,
    ...VALID_CULTURES,
    ...VALID_KEYWORDS,
    ...VALID_TARGET_TYPES,
    'SITE'
]));

// Cultures appartenant du côté Shadow (Ombre)
const SHADOW_CULTURES = [
    'ISENGARD', 'MORIA', 'SAURON', 'WRAITH', 
    'DUNLAND', 'RAIDER', 'MEN', 'ORC', 'URUK-HAI'
];

// ============================================================================
// 2. FONCTIONS UTILITAIRES DE PARSING CSV ET NETTOYAGE DE TEXTE
// ============================================================================

/**
 * Supprime TOUS les guillemets (droits, typographiques, français, doubles, simples)
 * situés au début, à la fin ou résiduels dans le texte.
 */
function stripQuotes(text) {
    if (!text) return undefined;
    
    const cleaned = text
        .trim()
        // Supprime tous les guillemets et espaces en tout début/fin de chaîne
        .replace(/^["'«»“”‘’`\s]+|["'«»“”‘’`\s]+$/g, '')
        // Nettoie également tout guillemet résiduel à l'intérieur
        .replace(/["“”«»]/g, '')
        .trim();

    return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Analyse le contenu brut d'un CSV en gérant correctement les guillemets de champs et retours à la ligne.
 */
function parseCsvContent(content) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < content.length; i++) {
        const char = content[i];
        const nextChar = content[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                currentCell += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\r' || char === '\n') && !inQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            currentRow.push(currentCell.trim());
            if (currentRow.some(cell => cell.length > 0)) rows.push(currentRow);
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }

    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }

    return rows;
}

/**
 * Nettoie le texte de lore/flavor (suppression des guillemets).
 */
function cleanLoreText(text) {
    return stripQuotes(text);
}

/**
 * Formate le texte de jeu : convertit <br> en \n, <keyword> en **bold**, et retire les guillemets.
 */
function formatGameText(text) {
    if (!text) return undefined;
    const formatted = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<keyword>([^<]+)<\/keyword>/gi, '**$1**');
    
    return stripQuotes(formatted);
}

/**
 * Normalise et mappe la culture (ex: convertit MAN en MEN).
 */
function mapCulture(cultureStr) {
    if (!cultureStr) return undefined;
    const cleanCulture = cultureStr.trim().toUpperCase();
    return cleanCulture === 'MAN' ? 'MEN' : cleanCulture;
}

/**
 * Extrait le marqueur d'alignement (Signet) depuis l'icône du bas.
 */
function parseSignet(bottomIcon) {
    if (!bottomIcon || !bottomIcon.startsWith('Signet_')) return undefined;
    return bottomIcon.replace('Signet_', '').toUpperCase();
}

/**
 * Extrait une valeur numérique de statistique (Force, Vitalité, etc.) avec fallback texte.
 */
function parseStat(primaryValue, fallbackText) {
    if (primaryValue !== '' && primaryValue !== undefined) {
        const parsed = parseInt(primaryValue, 10);
        if (!isNaN(parsed)) return parsed;
    }

    if (fallbackText && fallbackText.trim() !== '') {
        const parsedFallback = parseInt(fallbackText.trim(), 10);
        if (!isNaN(parsedFallback)) return parsedFallback;
    }

    return undefined;
}

/**
 * Construit un bloc i18n nettoyé (sans guillemets et sans clés undefined).
 */
function buildLangBlock(title, subtitle, gameText, lore) {
    const block = {
        title: stripQuotes(title),
        subtitle: stripQuotes(subtitle),
        gameText: formatGameText(gameText),
        loreText: cleanLoreText(lore),
    };

    Object.keys(block).forEach(key => {
        if (block[key] === undefined) delete block[key];
    });

    return Object.keys(block).length > 0 ? block : undefined;
}

// ============================================================================
// 3. FONCTIONS D'EXTRACTION DE RÈGLES MÉTIER (SUBTYPES, PHASES, ATTACHED_TO)
// ============================================================================

function parseClassAndPhases(classStr, englishText) {
    const phasesSet = new Set();
    const subTypeParts = [];

    if (classStr && classStr.trim()) {
        const parts = classStr.split(/[,;/]/);
        parts.forEach(part => {
            const cleanPart = part.trim().toUpperCase().replace(/\s+/g, '-');
            if (!cleanPart) return;

            if (GAME_PHASES.has(cleanPart)) {
                phasesSet.add(cleanPart);
            } else {
                subTypeParts.push(cleanPart);
            }
        });
    }

    if (englishText) {
        const keywordRegex = /<keyword>([^<]+)<\/keyword>/gi;
        let match;

        while ((match = keywordRegex.exec(englishText)) !== null) {
            const rawKeyword = match[1].replace(/[:.,]/g, '').trim().toUpperCase();

            if (GAME_PHASES.has(rawKeyword)) {
                phasesSet.add(rawKeyword);
            }
        }
    }

    const phases = Array.from(phasesSet);
    const subtype = subTypeParts.length > 0 ? subTypeParts.join('-') : undefined;

    return {
        subtype,
        phases: phases.length > 0 ? phases : undefined
    };
}

/**
 * Extrait la condition d'attachement d'une carte sous la forme d'un tableau 2D (DNF).
 * - Le premier niveau représente le "OU" (disjonction / alternatives)
 * - Le second niveau représente le "ET" (conjonction / critères requis simultanément)
 * Ex: [["MAN"], ["ELF"], ["WIZARD"]] ou [["ELVEN", "COMPANION"]]
 */
function parseAttachedTo(rawText) {
    if (!rawText) return undefined;

    const cleanText = rawText.replace(/\u00A0/g, ' ');
    let isControlled = undefined;

    // --- CAS SPECIAL : SITES ---
    if (/plays\s+on\s+a\s+site/i.test(cleanText)) {
        if (/plays\s+on\s+a\s+site\s+you\s+control/i.test(cleanText)) {
            isControlled = true;
        }
        return {
            attachedTo: [['SITE']],
            ...(isControlled !== undefined && { isControlled })
        };
    }

    // --- 1. ISOLER LA CLAUSE D'ATTACHEMENT ---
    // Matcher : "Bearer must be ...", "Attach to ...", "To play, attach to ..."
    const match = cleanText.match(/(?:Bearer must be|Attach to|To play, attach to)\s+([^.\n]+)/i);
    if (!match) return undefined;

    const fullClause = match[1].trim();

    // Suppression des balises HTML pour l'analyse
    const cleanClause = fullClause
        .replace(/<\/?(keyword|symbol)[^>]*>/gi, '')
        .trim();

    // --- 2. DÉTECTION DU NOM PROPRE (PAR ÉLIMINATION) ---
    // On regarde si la clause commence par "a " ou "an " (ex: "a Dwarf", "an Elf")
    const hasArticle = /^(a|an)\s+/i.test(cleanClause);

    // Si pas d'article "a/an", on vérifie d'abord si ce n'est pas un groupe générique
    // (ex: "Bearer must be an Elf or Dwarf" - le 2e mot n'a pas d'article mais est générique)
    const upperClause = cleanClause.toUpperCase();
    const containsGenericKeyword = KNOWN_ATTACHED_KEYWORDS.some(kw => 
        new RegExp(`\\b${kw}\\b`, 'i').test(upperClause)
    );

    // Si PAS d'article "a/an" ET PAS de mot-clé générique (Race, Culture, Keyword, Type)
    // -> C'est un NOM PROPRE !
    if (!hasArticle && !containsGenericKeyword) {
        // On nettoie d'éventuels préfixes résiduels et on garde la casse originale
        const properName = cleanClause.trim();
        if (properName.length > 0) {
            return {
                attachedTo: [[properName]]
            };
        }
    }

    // --- 3. DÉCOUPAGE DNF POUR LES MOTS-CLÉS GÉNÉRIQUES ---
    const rawGroups = cleanClause
        .split(/\bor\b|,/i)
        .map(g => g.trim())
        .filter(Boolean);

    const attachedToResult = [];

    for (const groupText of rawGroups) {
        const uppercaseGroup = groupText.toUpperCase();
        const foundInGroup = [];

        for (const kw of KNOWN_ATTACHED_KEYWORDS) {
            const regex = new RegExp(`\\b${kw}\\b`, 'i');
            if (regex.test(uppercaseGroup)) {
                foundInGroup.push(kw);
            }
        }

        if (foundInGroup.length > 0) {
            attachedToResult.push(foundInGroup);
        }
    }

    if (attachedToResult.length === 0) return undefined;

    return {
        attachedTo: attachedToResult
    };
}

// ============================================================================
// 4. PROCESSUS PRINCIPAL DE CONVERSION (convert)
// ============================================================================

async function convert() {
    console.log('🔄 Lecture et traitement du CSV des cartes...');

    // ------------------------------------------------------------------------
    // 4.1. Chargement et décodage explicite en Windows-1252
    // ------------------------------------------------------------------------
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ Fichier introuvable : ${CSV_PATH}`);
        return;
    }

    // Lecture du buffer binaire brut
    const buffer = fs.readFileSync(CSV_PATH);
    
    // Décodage explicite Windows-1252 vers string Unicode
    const decoder = new TextDecoder('windows-1252');
    let fileContent = decoder.decode(buffer);

    // Nettoyage de l'éventuel BOM
    if (fileContent.charCodeAt(0) === 0xFEFF) {
        fileContent = fileContent.slice(1);
    }

    const allRows = parseCsvContent(fileContent);

    if (allRows.length === 0) {
        console.error('❌ Le fichier CSV est vide !');
        return;
    }

    const headers = allRows[0].map(h => h.trim());
    const cardMap = new Map();
    const siteMap = new Map();

    // ------------------------------------------------------------------------
    // 4.2. Parcours ligne par ligne et extraction des données
    // ------------------------------------------------------------------------
    for (let i = 1; i < allRows.length; i++) {
        const row = allRows[i];
        if (row.length < 2) continue;

        const data = {};
        headers.forEach((h, index) => {
            data[h] = row[index] || '';
        });

        const cardId = data['Collectors Info'];
        if (!cardId) continue;

        const type = (data['Type'] || '').toUpperCase();
        const isSite = type === 'SITE';

        const frenchText = data['French Text'] || '';
        const englishText = data['Text'] || '';

        const targetMap = isSite ? siteMap : cardMap;

        // Déduplication : si la carte existe déjà, on garde la plus complète
        if (targetMap.has(cardId)) {
            const existing = targetMap.get(cardId);
            const existingTextLen = (existing.i18n?.fr?.gameText || existing.i18n?.en?.gameText || '').length;
            const newTextLen = (frenchText || englishText).length;
            if (newTextLen <= existingTextLen) continue;
        }

        // --- Détermination du camp (kind) ---
        const culture = (data['Culture'] || '').toUpperCase();
        const background = (data['Background'] || '').trim();

        let kind = 'FREE_PEOPLE';

        if (SHADOW_CULTURES.includes(culture)) {
            kind = 'SHADOW';
        } else if (culture === 'GOLLUM') {
            kind = background.toLowerCase().startsWith('gollum_') ? 'SHADOW' : 'FREE_PEOPLE';
        }

        if (isSite) {
            kind = 'SITE';
        }

        // --- Détection Porteur de l'Anneau ---
        const titleVO = (data['Title'] || '').trim();
        const bottomIcon = (data['Bottom Icon'] || '').trim();

        const isRingbearer = bottomIcon === 'Icon_ringbearer' || titleVO.toLowerCase() === 'frodo';
        const canBeRingbearer = isRingbearer ? true : undefined;

        // --- Visuels ---
        const rawImageCode = (data['Image'] || '').trim();
        const imageUrl = rawImageCode ? `/cards_visuals/o_${rawImageCode}.jpg` : undefined;

        // --- Subtypes, Phases & AttachedTo ---
        const { subtype, phases } = parseClassAndPhases(data['Class'], englishText);
        const attachmentData = parseAttachedTo(englishText);

        // --- Stats numériques ---
        const computedStrength = parseStat(data['Strength'], data['Top Text']);
        const computedVitality = parseStat(data['Vitality'], data['Middle Text']);
        const computedResistance = parseStat(data['Resistance'], data['Bottom Text']);

        // ------------------------------------------------------------------------
        // 4.3. Assemblage de l'objet Carte
        // ------------------------------------------------------------------------
        const cardObj = {
            id: cardId,
            set: parseInt(data['Set'], 10) || 0,
            rarity: data['Rarity'] || undefined,
            isUnique: data['Unique'] === '1',
            canBeRingbearer: canBeRingbearer,
            
            kind: kind,
            type: type,
            subtype: subtype,
            attachedTo: attachmentData?.attachedTo,
            isControlled: attachmentData?.isControlled,
            phases: phases,
            culture: mapCulture(data['Culture']),
            race: data['Race'] ? data['Race'].toUpperCase() : undefined,
            signet: parseSignet(bottomIcon),
            
            twilightCost: data['Twilight Cost'] !== '' ? parseInt(data['Twilight Cost'], 10) : 0,
            strength: computedStrength,
            vitality: computedVitality,
            resistance: computedResistance,
            
            minionSiteNumber: data['Minion Site Number'] !== '' ? parseInt(data['Minion Site Number'], 10) : undefined,
            allyHomeSites: data['Ally Home Sites'] || undefined,
            siteNumber: data['Site Number'] !== '' ? parseInt(data['Site Number'], 10) : undefined,
            siteArrow: data['Site Arrow'] || undefined,

            imageUrl: imageUrl,                          

            // Bloc internationalisation
            i18n: {
                en: buildLangBlock(data['Title'], data['Subtitle'], data['Text'], data['Lore']),
                fr: buildLangBlock(data['French Title'], data['French Subtitle'], data['French Text'], data['French Lore']),
                de: buildLangBlock(data['German Title'], data['German Subtitle'], data['German Text'], data['German Lore']),
                it: buildLangBlock(data['Italian Title'], data['Italian Subtitle'], data['Italian Text'], data['Italian Lore']),
                es: buildLangBlock(data['Spanish Title'], data['Spanish Subtitle'], data['Spanish Text'], data['Spanish Lore']),
            }
        };

        // Nettoyage des langues vides
        Object.keys(cardObj.i18n).forEach(lang => {
            if (!cardObj.i18n[lang]) delete cardObj.i18n[lang];
        });

        // Nettoyage des propriétés undefined à la racine
        Object.keys(cardObj).forEach((key) => {
            if (cardObj[key] === undefined) delete cardObj[key];
        });

        targetMap.set(cardId, cardObj);
    }

    // ------------------------------------------------------------------------
    // 4.4. Écriture des fichiers JSON finaux (UTF-8)
    // ------------------------------------------------------------------------
    const cardsArray = Array.from(cardMap.values());
    const sitesArray = Array.from(siteMap.values());

    const outputDir = path.dirname(OUTPUT_CARDS_PATH);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_CARDS_PATH, JSON.stringify(cardsArray, null, 2), 'utf-8');
    fs.writeFileSync(OUTPUT_SITES_PATH, JSON.stringify(sitesArray, null, 2), 'utf-8');

    console.log(`✅ Conversion réussie !`);
    console.log(`🃏 Cartes : ${cardsArray.length} -> ${OUTPUT_CARDS_PATH}`);
    console.log(`🏞️ Sites  : ${sitesArray.length} -> ${OUTPUT_SITES_PATH}`);
}

// ============================================================================
// 5. EXÉCUTION DU SCRIPT
// ============================================================================

convert().catch(console.error);