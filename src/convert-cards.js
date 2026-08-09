import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'cards.csv'); 
const OUTPUT_CARDS_PATH = path.join(process.cwd(), 'data/cards.json');
const OUTPUT_SITES_PATH = path.join(process.cwd(), 'data/sites.json');

// Liste canonique des 8 phases / déclencheurs du jeu LotR TCG
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

/**
 * Parser CSV conforme RFC-4180 avec support des guillemets et retours à la ligne
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

function cleanLoreText(text) {
    if (!text) return undefined;
    const cleaned = text.trim().replace(/^["'«»“”‘’\s]+|["'«»“”‘’\s]+$/g, '').trim();
    return cleaned.length > 0 ? cleaned : undefined;
}

/**
 * Nettoie et formate le texte de jeu pour toutes les langues :
 * 1. Remplace <br>, <br/>, <br /> par des retours à la ligne (\n)
 * 2. Remplace <keyword>Texte</keyword> par **Texte** pour le rendu en gras
 */
function formatGameText(text) {
    if (!text) return undefined;
    return text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<keyword>([^<]+)<\/keyword>/gi, '**$1**');
}

function parseSignet(bottomIcon) {
    if (!bottomIcon || !bottomIcon.startsWith('Signet_')) return undefined;
    return bottomIcon.replace('Signet_', '').toUpperCase();
}

function mapCulture(cultureStr) {
    return cultureStr ? cultureStr.toUpperCase() : undefined;
}

/**
 * Analyse la colonne "Class" et le texte anglais pour séparer :
 * 1. Le sous-type métier (ex: "HAND-WEAPON", "RING") -> string
 * 2. Les phases de jeu (ex: ["ARCHERY", "RESPONSE"]) -> string[]
 */
function parseClassAndPhases(classStr, englishText) {
    const phasesSet = new Set();
    const subTypeParts = [];

    // 1. Analyse de la colonne "Class"
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

    // 2. Extraction des phases depuis le texte anglais (<keyword>Phase:</keyword>)
    if (englishText) {
        const keywordRegex = /<keyword>([^<]+)<\/keyword>/gi;
        let match;

        while ((match = keywordRegex.exec(englishText)) !== null) {
            // Supprime la ponctuation (ex: "Archery:" -> "ARCHERY")
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
 * Construit un bloc i18n nettoyé d'une langue donnée.
 */
function buildLangBlock(title, subtitle, gameText, lore) {
    const block = {
        title: title || undefined,
        subtitle: subtitle || undefined,
        gameText: formatGameText(gameText),
        loreText: cleanLoreText(lore),
    };

    Object.keys(block).forEach(key => {
        if (block[key] === undefined) delete block[key];
    });

    return Object.keys(block).length > 0 ? block : undefined;
}

async function convert() {
    console.log('🔄 Lecture et traitement du CSV des cartes...');

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ Fichier introuvable : ${CSV_PATH}`);
        return;
    }

    const fileBuffer = fs.readFileSync(CSV_PATH);
    const decoder = new TextDecoder('windows-1252');
    const fileContent = decoder.decode(fileBuffer);

    const allRows = parseCsvContent(fileContent);

    if (allRows.length === 0) {
        console.error('❌ Le fichier CSV est vide !');
        return;
    }

    const headers = allRows[0].map(h => h.trim());
    const cardMap = new Map();
    const siteMap = new Map();

    const shadowCultures = [
        'ISENGARD', 'MORIA', 'SAURON', 'WRAITH', 
        'DUNLAND', 'RAIDER', 'MEN', 'ORC', 'URUK-HAI'
    ];

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

        // Dédoublonnage : conservation de la version avec le texte de jeu le plus long
        if (targetMap.has(cardId)) {
            const existing = targetMap.get(cardId);
            const existingTextLen = (existing.i18n?.fr?.gameText || existing.i18n?.en?.gameText || '').length;
            const newTextLen = (frenchText || englishText).length;
            if (newTextLen <= existingTextLen) continue;
        }

        // --- Détermination de Faction / Kind ---
        const culture = (data['Culture'] || '').toUpperCase();
        const background = (data['Background'] || '').trim();

        let kind = 'FREE_PEOPLE';

        if (shadowCultures.includes(culture)) {
            kind = 'SHADOW';
        } else if (culture === 'GOLLUM') {
            kind = background.toLowerCase().startsWith('gollum_') ? 'SHADOW' : 'FREE_PEOPLE';
        }

        if (isSite) {
            kind = 'SITE';
        }

        // --- Détection du Porteur potentiel de l'Anneau ---
        const titleVO = (data['Title'] || '').trim();
        const bottomIcon = (data['Bottom Icon'] || '').trim();

        const isRingbearer = bottomIcon === 'Icon_ringbearer' || titleVO.toLowerCase() === 'frodo';
        const canBeRingbearer = isRingbearer ? true : undefined;

        const rawImageCode = (data['Image'] || '').trim();
        const imageUrl = rawImageCode ? `/cards_visuals/o_${rawImageCode}.jpg` : undefined;

        // Extraction distincte du sous-type et des phases
        const { subtype, phases } = parseClassAndPhases(data['Class'], englishText);

        // Structure finale de la carte
        const cardObj = {
            id: cardId,
            set: parseInt(data['Set'], 10) || 0,
            rarity: data['Rarity'] || undefined,
            isUnique: data['Unique'] === '1',
            canBeRingbearer: canBeRingbearer,
            
            kind: kind,
            type: type,
            subtype: subtype,
            phases: phases,
            culture: mapCulture(data['Culture']),
            race: data['Race'] ? data['Race'].toUpperCase() : undefined,
            signet: parseSignet(bottomIcon),
            
            twilightCost: data['Twilight Cost'] !== '' ? parseInt(data['Twilight Cost'], 10) : 0,
            strength: data['Strength'] !== '' ? parseInt(data['Strength'], 10) : undefined,
            vitality: data['Vitality'] !== '' ? parseInt(data['Vitality'], 10) : undefined,
            resistance: data['Resistance'] !== '' ? parseInt(data['Resistance'], 10) : undefined,
            
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

        // Nettoyage des langues sans contenu
        Object.keys(cardObj.i18n).forEach(lang => {
            if (!cardObj.i18n[lang]) delete cardObj.i18n[lang];
        });

        // Nettoyage des propriétés undefined à la racine
        Object.keys(cardObj).forEach((key) => {
            if (cardObj[key] === undefined) delete cardObj[key];
        });

        targetMap.set(cardId, cardObj);
    }

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

convert().catch(console.error);