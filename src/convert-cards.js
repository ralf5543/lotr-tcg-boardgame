import fs from 'fs';
import path from 'path';

const CSV_PATH = path.join(process.cwd(), 'cards.csv'); 
const OUTPUT_CARDS_PATH = path.join(process.cwd(), 'data/cards.json');
const OUTPUT_SITES_PATH = path.join(process.cwd(), 'data/sites.json');

// Parser CSV RFC-4180
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
    let cleaned = text.trim().replace(/^["'«»“”‘’\s]+|["'«»“”‘’\s]+$/g, '').trim();
    return cleaned.length > 0 ? cleaned : undefined;
}

function parseSignet(bottomIcon) {
    if (!bottomIcon || !bottomIcon.startsWith('Signet_')) return undefined;
    return bottomIcon.replace('Signet_', '').toUpperCase();
}

function mapCulture(cultureStr) {
    return cultureStr ? cultureStr.toUpperCase() : undefined;
}

async function convert() {
    console.log('🔄 Lecture et séparation des cartes...');

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

        // Sélection de la map cible (sites ou cartes standard)
        const targetMap = isSite ? siteMap : cardMap;

        // Dédoublonnage : on conserve la version la plus complète
        if (targetMap.has(cardId)) {
            const existing = targetMap.get(cardId);
            const existingTextLen = (existing.gameText || '').length;
            const newTextLen = (frenchText || englishText).length;
            if (newTextLen <= existingTextLen) continue;
        }

        // --- Détermination de Faction / Kind ---
        const culture = (data['Culture'] || '').toUpperCase();
        const background = (data['Background'] || '').trim();

        // Cultures Shadow standard
        const shadowCultures = [
            'ISENGARD', 'MORIA', 'SAURON', 'RINGWRAITH', 
            'DUNLAND', 'RAIDER', 'MEN', 'ORC', 'URUK-HAI'
        ];

        let kind = 'FREE_PEOPLE';

        if (shadowCultures.includes(culture)) {
            kind = 'SHADOW';
        } else if (culture === 'GOLLUM') {
            // Cas particulier Gollum/Sméagol :
            // Si le background commence par "Gollum_", c'est une carte Shadow.
            // Sinon (ex: "Smeagol_"), elle appartient aux Peuples Libres (FREE_PEOPLE).
            if (background.toLowerCase().startsWith('gollum_')) {
                kind = 'SHADOW';
            } else {
                kind = 'FREE_PEOPLE';
            }
        }

        if (isSite) {
            kind = 'SITE';
        }

        const title = data['French Title'] || data['Title'];
        const subtitle = data['French Subtitle'] || data['Subtitle'] || undefined;
        const gameText = frenchText || englishText;
        const loreText = cleanLoreText(data['French Lore'] || data['Lore']);

        const rawImageCode = (data['Image'] || '').trim();
        const imageUrl = rawImageCode ? `/cards_visuals/o_${rawImageCode}.jpg` : undefined;

        const cardObj = {
            id: cardId,
            set: parseInt(data['Set'], 10) || 0,
            rarity: data['Rarity'] || undefined,
            isUnique: data['Unique'] === '1',
            
            title: title,
            subtitle: subtitle,
            kind: kind,
            type: type,
            culture: mapCulture(data['Culture']),
            race: data['Race'] ? data['Race'].toUpperCase() : undefined,
            signet: parseSignet(data['Bottom Icon']),
            
            twilightCost: data['Twilight Cost'] !== '' ? parseInt(data['Twilight Cost'], 10) : 0,
            strength: data['Strength'] !== '' ? parseInt(data['Strength'], 10) : undefined,
            vitality: data['Vitality'] !== '' ? parseInt(data['Vitality'], 10) : undefined,
            resistance: data['Resistance'] !== '' ? parseInt(data['Resistance'], 10) : undefined,
            
            minionSiteNumber: data['Minion Site Number'] !== '' ? parseInt(data['Minion Site Number'], 10) : undefined,
            allyHomeSites: data['Ally Home Sites'] || undefined,
            siteNumber: data['Site Number'] !== '' ? parseInt(data['Site Number'], 10) : undefined,
            siteArrow: data['Site Arrow'] || undefined,

            imageUrl: imageUrl,                          
            gameText: gameText || undefined,
            loreText: loreText,

            i18n: {
                en: {
                    title: data['Title'],
                    subtitle: data['Subtitle'] || undefined,
                    gameText: data['Text'] || undefined,
                    loreText: cleanLoreText(data['Lore']),
                },
                fr: {
                    title: data['French Title'] || undefined,
                    subtitle: data['French Subtitle'] || undefined,
                    gameText: data['French Text'] || undefined,
                    loreText: cleanLoreText(data['French Lore']),
                },
                de: {
                    title: data['German Title'] || undefined,
                    subtitle: data['German Subtitle'] || undefined,
                    gameText: data['German Text'] || undefined,
                    loreText: cleanLoreText(data['German Lore']),
                },
                it: {
                    title: data['Italian Title'] || undefined,
                    subtitle: data['Italian Subtitle'] || undefined,
                    gameText: data['Italian Text'] || undefined,
                    loreText: cleanLoreText(data['Italian Lore']),
                },
                es: {
                    title: data['Spanish Title'] || undefined,
                    subtitle: data['Spanish Subtitle'] || undefined,
                    gameText: data['Spanish Text'] || undefined,
                    loreText: cleanLoreText(data['Spanish Lore']),
                },
            }
        };

        // Supprime les clés undefined
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
    console.log(`🃏 Cartes de jeu (Free & Shadow) : ${cardsArray.length} -> ${OUTPUT_CARDS_PATH}`);
    console.log(`🏞️ Cartes de Sites : ${sitesArray.length} -> ${OUTPUT_SITES_PATH}`);
}

convert().catch(console.error);