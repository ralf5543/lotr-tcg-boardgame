import fs from 'fs';
import path from 'path';

// ============================================================================ 
// 1. CONFIGURATION DES CHEMINS ET CONSTANTES DU JEU 
// ============================================================================ 

const CSV_PATH = path.join(process.cwd(), 'lotro_card_data.csv');
const OUTPUT_CARDS_PATH = path.join(process.cwd(), 'data/cards.json');
const OUTPUT_SITES_PATH = path.join(process.cwd(), 'data/sites.json');

// Liste des personnages féminins du jeu (pour le flag SFX)
const FEMALE_TITLES = new Set([
    'Galadriel',
    'Éowyn',
    'Arwen',
    'Rosie Cotton',
    'Uruviel',
    'Goldberry'
]);

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
    'MAIA', 'MAN', 'NAZGÛL', 'ORC', 'SPIDER', 'TROLL',
    'URUK-HAI', 'WIZARD', 'WRAITH'
]);

// Cultures valides 
const VALID_CULTURES = new Set([
    'DUNLAND', 'DWARVEN', 'ELVEN', 'GANDALF', 'GOLLUM',
    'GONDOR', 'ISENGARD', 'MEN', 'MORIA', 'ORC',
    'RAIDER', 'WRAITH', 'ROHAN', 'SAURON', 'SHIRE',
    'THE-ONE-RING', 'URUK-HAI'
]);

// Mots-clés officiels et exhaustifs du jeu (pour la clé "keywords") 
const VALID_KEYWORDS = new Set([
    'AID', 'AMBUSH', 'ARCHER', 'BATTLEGROUND', 'BESIEGER', 'CORSAIR',
    'DAMAGE +1', 'DAMAGE +2', 'DAMAGE +3', 'DAMAGE +4',
    'DEFENDER +1', 'DEFENDER +2', 'DEFENDER +3', 'DEFENDER +4',
    'DWELLING', 'EASTERLING', 'ENDURING', 'ENGINE', 'FIERCE', 'FOREST',
    'FORTIFICATION', 'HUNTER 1', 'HUNTER 2', 'HUNTER 3', 'HUNTER 4',
    'KNIGHT', 'LURKER', 'MACHINE', 'MARSH', 'MOUNTAIN', 'MUSTER',
    'PIPEWEED', 'PLAINS', 'RANGER', 'RING-BEARER', 'RING-BOUND', 'RIVER',
    'SEARCH', 'SOUTHRON', 'SPELL', 'STEALTH', 'TALE', 'TENTACLE',
    'TOIL 1', 'TOIL 2', 'TOIL 3', 'TRACKER', 'TWILIGHT', 'UNBOUND', 'UNDERGROUND',
    'UNHASTY', 'VALIANT', 'VILLAGER', 'WARG-RIDER', 'WEATHER'
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

function stripQuotes(text) {
    if (!text) return undefined;

    const cleaned = text
        .trim()
        .replace(/^["'«»“”‘’`\s]+|["'«»“”‘’`\s]+$/g, '')
        .replace(/["“”«»]/g, '')
        .trim();

    return cleaned.length > 0 ? cleaned : undefined;
}

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

function cleanLoreText(text) {
    return stripQuotes(text);
}

function formatGameText(text) {
    if (!text) return undefined;

    let formatted = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<keyword>Ambush<\/keyword>\s*(<symbol>twilight\d+<\/symbol>)/gi, '**Ambush** $1')
        .replace(/<keyword>([^<]+)<\/keyword>/gi, '**$1**');

    return formatted.trim();
}

function mapCulture(cultureStr) {
    if (!cultureStr) return undefined;
    const cleanCulture = cultureStr.trim().toUpperCase();
    return cleanCulture === 'MAN' ? 'MEN' : cleanCulture;
}

function parseSignet(bottomIcon) {
    if (!bottomIcon || !bottomIcon.startsWith('Signet_')) return undefined;
    return bottomIcon.replace('Signet_', '').toUpperCase();
}

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
// 3. FONCTIONS D'EXTRACTION DE RÈGLES MÉTIER 
// ============================================================================ 

function parseKeywords(text, titleVO, type, isRingbearer) {
    const keywords = [];

    if (text) {
        const ambushRegex = /<keyword>Ambush<\/keyword>\s*<symbol>twilight(\d+)<\/symbol>/gi;
        let ambushMatch;
        while ((ambushMatch = ambushRegex.exec(text)) !== null) {
            const cost = ambushMatch[1];
            const kw = `AMBUSH ${cost}`;
            if (!keywords.includes(kw)) {
                keywords.push(kw);
            }
        }

        const regex = /<keyword>([A-Z][^<]*\.)<\/keyword>/g;
        let match;
        while ((match = regex.exec(text)) !== null) {
            const rawKw = match[1].slice(0, -1).trim();
            const upperKw = rawKw.toUpperCase();

            if (VALID_KEYWORDS.has(upperKw)) {
                if (!keywords.includes(upperKw)) {
                    keywords.push(upperKw);
                }
            }
        }
    }

    if (titleVO && titleVO.toLowerCase().startsWith('sam') && !keywords.includes('RING-BOUND')) {
        keywords.push('RING-BOUND');
    }

    if (type === 'COMPANION') {
        const isRingbound = keywords.includes('RING-BOUND');
        if (!isRingbearer && !isRingbound && !keywords.includes('UNBOUND')) {
            keywords.push('UNBOUND');
        }
    }

    return keywords.length > 0 ? keywords : undefined;
}

function parseClassAndPhases(classStr, englishText, type) {
    const textPhasesSet = new Set();
    const subTypeParts = [];

    if (classStr && classStr.trim()) {
        const parts = classStr.split(/[,;/]/);
        parts.forEach(part => {
            const cleanPart = part.trim().toUpperCase().replace(/\s+/g, '-');
            if (!cleanPart) return;

            if (GAME_PHASES.has(cleanPart)) {
                textPhasesSet.add(cleanPart);
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
                textPhasesSet.add(rawKeyword);
            }
        }
    }

    const detectedPhases = Array.from(textPhasesSet);
    const subtype = subTypeParts.length > 0 ? subTypeParts.join('-') : undefined;

    const isEvent = type === 'EVENT';

    return {
        subtype,
        phases: isEvent && detectedPhases.length > 0 ? detectedPhases : undefined,
        actionPhases: !isEvent && detectedPhases.length > 0 ? detectedPhases : undefined
    };
}

function parseAttachedTo(text) {
    if (!text) return null;

    if (/plays on a site/i.test(text)) {
        return [
            ["SITE"]
        ];
    }

    const match = text.match(/Bearer must be\s+([^.]+)\./i);
    if (!match) return null;

    const rawClause = match[1].trim();
    const textWithoutTags = rawClause.replace(/<[^>]+>/g, '').trim();

    const isGeneric = /^(a|an)\s+/i.test(textWithoutTags);

    if (!isGeneric) {
        if (textWithoutTags.length > 0) {
            return [
                [textWithoutTags]
            ];
        }
    }

    function extractKeywords(segment) {
        const keywords = [];

        segment = segment.replace(/<(symbol|keyword)>(.*?)<\/\1>/gi, (_, tag, content) => {
            if (content) {
                // 🟢 Support des lettres accentuées UTF-8 (comme û / Û)
                const clean = content.replace(/[^a-zA-Z-áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜûÛñÑ]/g, '').toUpperCase();
                if (clean) keywords.push(clean);
            }
            return ' ';
        });

        const cleanSegment = segment.replace(/<[^>]+>/g, ' ');

        const words = cleanSegment.split(/\s+/);
        for (const word of words) {
            // 🟢 Support des lettres accentuées UTF-8 pour conserver NAZGÛL
            const cleanWord = word.replace(/[^a-zA-Z-áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜûÛñÑ]/g, '').toUpperCase();
            if (cleanWord && !['A', 'AN', 'OR'].includes(cleanWord)) {
                keywords.push(cleanWord);
            }
        }

        return keywords;
    }

    if (rawClause.includes(',') || /\bor\b/i.test(rawClause)) {
        const parts = rawClause.split(/,|\s+or\s+/i);
        const results = [];

        for (const part of parts) {
            const kw = extractKeywords(part);
            if (kw.length > 0) {
                results.push(kw);
            }
        }

        return results.length > 0 ? results : null;
    }

    const combinedKeywords = extractKeywords(rawClause);
    return combinedKeywords.length > 0 ? [combinedKeywords] : null;
}

function parseToPlayConditions(text) {
    if (!text) return undefined;

    // Capture "To play," même après des mots-clés initiaux
    const match = text.match(/(?:^|[\n.]).*?To play,\s+([^.\n]+)/i);
    if (!match) return undefined;

    const rawClause = match[1].trim();

    function extractCount(str) {
        const m = str.match(/\b(\d+)\b/);
        return m ? parseInt(m[1], 10) : 1;
    }

    function normalizeToken(token) {
        const clean = token.replace(/[^a-zA-Z-áéíóúÁÉÍÓÚàèìòùÀÈÌÒÙäëïöüÄËÏÖÜûÛñÑ]/g, '');
        const upper = clean.toUpperCase();

        const plurals = {
            'ELVES': 'ELF',
            'DWARVES': 'DWARF',
            'HOBBITS': 'HOBBIT',
            'ENTS': 'ENT',
            'ORCS': 'ORC',
            'RANGERS': 'RANGER',
            'MINIONS': 'MINION',
            'COMPANIONS': 'COMPANION',
            'ALLIES': 'ALLY',
            'KNIGHTS': 'KNIGHT',
            'SPIDERS': 'SPIDER',
            'TROLLS': 'TROLL',
            'NAZGÛL': 'NAZGÛL'
        };

        return plurals[upper] || upper;
    }

    function parseTarget(bodyText) {
        const targets = [];

        // RÈGLE MAN : Uniquement si précédé de Gondor ou Rohan
        let processedText = bodyText.replace(/<symbol>(gondor|rohan)<\/symbol>\s+men\b/gi, '<symbol>$1</symbol> MAN');
        processedText = processedText.replace(/\b(gondor|rohan)\s+men\b/gi, '$1 MAN');

        let cleanBody = processedText.replace(/<symbol>(.*?)<\/symbol>/gi, (_, culture) => {
            if (culture) targets.push(culture.toUpperCase());
            return ' ';
        });

        cleanBody = cleanBody.replace(/<keyword>(.*?)<\/keyword>/gi, (_, kw) => {
            if (kw) targets.push(kw.replace(/[:.,]/g, '').toUpperCase());
            return ' ';
        });

        cleanBody = cleanBody.replace(/[*_#<>[\]]/g, ' ').trim();

        const words = cleanBody.split(/\s+/).filter(Boolean);

        const EXCLUDED_WORDS = new Set([
            'A', 'AN', 'YOUR', 'OR', 'FROM', 'IN', 'PLAY', 'HAND', 'CARD', 'CARDS',
            'SPOT', 'EXERT', 'DISCARD', 'REMOVE', 'ADD', 'AND'
        ]);

        for (const word of words) {
            const normalized = normalizeToken(word);
            if (normalized && !EXCLUDED_WORDS.has(normalized)) {
                let finalToken = normalized;
                if (finalToken === 'MEN' && targets.some(t => ['GONDOR', 'ROHAN'].includes(t))) {
                    finalToken = 'MAN';
                }

                const isKnownTarget = VALID_RACES.has(finalToken) || VALID_TARGET_TYPES.has(finalToken) || VALID_CULTURES.has(finalToken);
                const isProperName = /^[A-Z][a-zà-ÿ]+/.test(word);

                targets.push(isKnownTarget ? finalToken : (isProperName ? word : finalToken));
            }
        }

        return targets;
    }

    // 1. Découpage sur "OR" (choix alternatifs)
    const rawOptions = rawClause.split(/\s+or\s+/i);
    const parsedOptions = [];

    for (let optionText of rawOptions) {
        optionText = optionText.trim();
        const optionObj = {};

        // 2. Découpage sur "AND" (conditions cumulatives)
        const segments = optionText.split(/\s+and\s+/i);

        for (let segment of segments) {
            segment = segment.trim();

            // Détection du verbe propre à CE segment (défaut sur 'spot')
            const verbMatch = segment.match(/\b(spot|exert|discard|remove|add)\b/i);
            const currentVerb = verbMatch ? verbMatch[1].toLowerCase() : 'spot';

            const count = extractCount(segment);

            if (/discard.*hand/i.test(segment) || (currentVerb === 'discard' && /hand/i.test(segment))) {
                optionObj.discardFromHand = count;
            } else if (/burdens?/i.test(segment)) {
                if (currentVerb === 'remove') optionObj.removeBurdens = count;
                else if (currentVerb === 'add') optionObj.addBurdens = count;
                else optionObj.spotBurdens = count;
            } else if (/threats?/i.test(segment)) {
                if (currentVerb === 'remove') optionObj.removeThreats = count;
                else if (currentVerb === 'add') optionObj.addThreats = count;
                else optionObj.spotThreats = count;
            } else {
                const targets = parseTarget(segment);
                if (targets.length > 0) {
                    const key = currentVerb === 'discard' ? 'discardFromPlay' : currentVerb;

                    // Si l'action existe déjà (ex: multiple spot), on append
                    if (!optionObj[key]) optionObj[key] = [];
                    optionObj[key].push({
                        count,
                        target: [targets]
                    });
                }
            }
        }

        if (Object.keys(optionObj).length > 0) {
            parsedOptions.push(optionObj);
        }
    }

    return parsedOptions.length > 0 ? parsedOptions : undefined;
}

// ============================================================================ 
// 4. PROCESSUS PRINCIPAL DE CONVERSION (convert) 
// ============================================================================ 

async function convert() {
    console.log('🔄 Lecture et traitement du CSV des cartes...');

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ Fichier introuvable : ${CSV_PATH}`);
        return;
    }

    const buffer = fs.readFileSync(CSV_PATH);
    const decoder = new TextDecoder('windows-1252');
    let fileContent = decoder.decode(buffer);

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

        if (targetMap.has(cardId)) {
            const existing = targetMap.get(cardId);
            const existingTextLen = (existing.i18n ? .fr ? .gameText || existing.i18n ? .en ? .gameText || '').length;
            const newTextLen = (frenchText || englishText).length;
            if (newTextLen <= existingTextLen) continue;
        }

        const culture = mapCulture(data['Culture']);
        const background = (data['Background'] || '').trim();

        let kind = 'FREE_PEOPLE';

        if (culture && SHADOW_CULTURES.includes(culture)) {
            kind = 'SHADOW';
        } else if (culture === 'GOLLUM') {
            kind = background.toLowerCase().startsWith('gollum_') ? 'SHADOW' : 'FREE_PEOPLE';
        }

        if (isSite) {
            kind = 'SITE';
        }

        const titleVO = (data['Title'] || '').trim();
        const bottomIcon = (data['Bottom Icon'] || '').trim();

        const isRingbearer = bottomIcon === 'Icon_ringbearer' || titleVO.toLowerCase() === 'frodo';
        const canBeRingbearer = isRingbearer ? true : undefined;

        const isFemale = FEMALE_TITLES.has(titleVO) ? true : undefined;

        const rawImageCode = (data['Image'] || '').trim();
        const imageUrl = rawImageCode ? `/cards_visuals/o_${rawImageCode}.jpg` : undefined;

        // Appel UNIQUE de parseClassAndPhases
        const {
            subtype,
            phases,
            actionPhases
        } = parseClassAndPhases(data['Class'], englishText, type);

        // Mots-clés avec règles logiques natives (UNBOUND / RING-BOUND)
        const keywords = parseKeywords(englishText, titleVO, type, isRingbearer);
        const attachmentData = parseAttachedTo(englishText);

        const computedStrength = parseStat(data['Strength'], data['Top Text']);
        const computedVitality = parseStat(data['Vitality'], data['Middle Text']);
        const computedResistance = parseStat(data['Resistance'], data['Bottom Text']);

        const toPlayData = parseToPlayConditions(englishText);

        const cardObj = {
            id: cardId,
            set: parseInt(data['Set'], 10) || 0,
            rarity: data['Rarity'] || undefined,
            isUnique: data['Unique'] === '1',
            canBeRingbearer: canBeRingbearer,
            isFemale: isFemale,

            kind: kind,
            type: type,
            subtype: subtype,
            keywords: keywords,
            attachedTo: attachmentData || undefined,
            toPlay: toPlayData,
            phases: phases,
            actionPhases: actionPhases,
            culture: culture,
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

            i18n: {
                en: buildLangBlock(data['Title'], data['Subtitle'], data['Text'], data['Lore']),
                fr: buildLangBlock(data['French Title'], data['French Subtitle'], data['French Text'], data['French Lore']),
                de: buildLangBlock(data['German Title'], data['German Subtitle'], data['German Text'], data['German Lore']),
                it: buildLangBlock(data['Italian Title'], data['Italian Subtitle'], data['Italian Text'], data['Italian Lore']),
                es: buildLangBlock(data['Spanish Title'], data['Spanish Subtitle'], data['Spanish Text'], data['Spanish Lore']),
            }
        };

        Object.keys(cardObj.i18n).forEach(lang => {
            if (!cardObj.i18n[lang]) delete cardObj.i18n[lang];
        });

        Object.keys(cardObj).forEach((key) => {
            if (cardObj[key] === undefined) delete cardObj[key];
        });

        targetMap.set(cardId, cardObj);
    }

    const cardsArray = Array.from(cardMap.values());
    const sitesArray = Array.from(siteMap.values());

    const outputDir = path.dirname(OUTPUT_CARDS_PATH);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, {
            recursive: true
        });
    }

    fs.writeFileSync(OUTPUT_CARDS_PATH, JSON.stringify(cardsArray, null, 2), 'utf-8');
    fs.writeFileSync(OUTPUT_SITES_PATH, JSON.stringify(sitesArray, null, 2), 'utf-8');

    console.log(`✅ Conversion réussie !`);
    console.log(`🃏 Cartes : ${cardsArray.length} -> ${OUTPUT_CARDS_PATH}`);
    console.log(`🏞️ Sites  : ${sitesArray.length} -> ${OUTPUT_SITES_PATH}`);
}

convert().catch(console.error);