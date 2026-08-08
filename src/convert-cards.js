import fs from 'fs';
import readline from 'readline';
import path from 'path';

// Encodage 'latin1' pour réparer automatiquement les caractères accentués cassés (ISO-8859-1)
const CSV_PATH = path.join(process.cwd(), 'cards.csv'); 
const OUTPUT_JSON_PATH = path.join(process.cwd(), 'src/data/cards.json');

// Helper pour nettoyer les guillemets et espaces du CSV
function cleanValue(val) {
    if (!val) return '';
    let cleaned = val.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
        cleaned = cleaned.slice(1, -1);
    }
    return cleaned.replace(/""/g, '"').trim();
}

// Analyse d'une ligne CSV en tenant compte des virgules entre guillemets
function parseCsvLine(line) {
    const result = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
            cur += char;
        } else if (char === ',' && !inQuotes) {
            result.push(cleanValue(cur));
            cur = '';
        } else {
            cur += char;
        }
    }
    result.push(cleanValue(cur));
    return result;
}

// Mapping de culture CSV vers ton enum interne
function mapCulture(cultureStr) {
    if (!cultureStr) return undefined;
    const c = cultureStr.toUpperCase();
    if (c === 'DWARVEN') return 'DWARVEN';
    if (c === 'ELVEN') return 'ELVEN';
    if (c === 'GANDALF') return 'GANDALF';
    if (c === 'GONDOR') return 'GONDOR';
    if (c === 'SHIRE') return 'SHIRE';
    if (c === 'ISENGARD') return 'ISENGARD';
    if (c === 'MORIA') return 'MORIA';
    if (c === 'SAURON') return 'SAURON';
    if (c === 'RINGWRAITH') return 'RINGWRAITH';
    if (c === 'GOLLUM') return 'GOLLUM';
    return c;
}

// Mapping de type CSV vers ton type interne
function mapType(typeStr) {
    if (!typeStr) return 'COMPANION';
    const t = typeStr.toUpperCase();
    if (t === 'SITE') return 'SITE';
    if (t === 'POSSESSION') return 'POSSESSION';
    if (t === 'EVENT') return 'EVENT';
    if (t === 'COMPANION') return 'COMPANION';
    if (t === 'MINION') return 'MINION';
    if (t === 'ALLY') return 'ALLY';
    if (t === 'CONDITION') return 'CONDITION';
    return t;
}

async function convert() {
    console.log('🔄 Lecture et conversion du CSV en cours...');

    // Utilisation de l'encodage 'latin1' pour réparer les accents (é, è, à, œ, etc.)
    const fileStream = fs.createReadStream(CSV_PATH, { encoding: 'latin1' });
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
    });

    let headers = [];
    const cards = [];
    let isFirstLine = true;

    for await (const line of rl) {
        if (!line.trim()) continue;

        const row = parseCsvLine(line);

        if (isFirstLine) {
            headers = row;
            isFirstLine = false;
            continue;
        }

        // Création d'un objet map par nom de colonne
        const data = {};
        headers.forEach((h, index) => {
            data[h] = row[index] || '';
        });

        // Détermination de la faction / Kind (FREE_PEOPLE vs SHADOW vs SITE)
        const rawType = mapType(data['Type']);
        let kind = 'FREE_PEOPLE';
        if (['ISENGARD', 'MORIA', 'SAURON', 'RINGWRAITH', 'GOLLUM'].includes(data['Culture']?.toUpperCase())) {
            kind = 'SHADOW';
        }
        if (rawType === 'SITE') {
            kind = 'SITE';
        }

        // On privilégie les textes français s'ils existent, sinon anglais
        const title = data['French Title'] || data['Title'];
        const subtitle = data['French Subtitle'] || data['Subtitle'] || undefined;
        const gameText = data['French Text'] || data['Text'];
        const loreText = data['French Lore'] || data['Lore'] || undefined;

        // Construction de l'objet carte compatible TypeScript / React
        const cardObj = {
            id: `card_${data['Id']}`,
            code: data['Collectors Info'],
            set: parseInt(data['Set'], 10) || 0,
            title: title,
            subtitle: subtitle,
            kind: kind,
            type: rawType,
            culture: mapCulture(data['Culture']),
            race: data['Race'] ? data['Race'].toUpperCase() : undefined,
            isUnique: data['Unique'] === '1',
            twilightCost: data['Twilight Cost'] !== '' ? parseInt(data['Twilight Cost'], 10) : 0,
            strength: data['Strength'] !== '' ? parseInt(data['Strength'], 10) : undefined,
            vitality: data['Vitality'] !== '' ? parseInt(data['Vitality'], 10) : undefined,
            resistance: data['Resistance'] !== '' ? parseInt(data['Resistance'], 10) : undefined,
            siteNumber: data['Site Number'] !== '' ? parseInt(data['Site Number'], 10) : undefined,
            imageUrl: data['Image'] ? `/cards/${data['Image']}.webp` : undefined,
            gameText: gameText,
            loreText: loreText,
            // Version originale anglaise stockée si besoin plus tard
            englishTitle: data['Title'],
        };

        // Nettoyage des clés undefined pour avoir un JSON super propre
        Object.keys(cardObj).forEach((key) => {
            if (cardObj[key] === undefined) {
                delete cardObj[key];
            }
        });

        cards.push(cardObj);
    }

    // Sauvegarde du fichier JSON
    const outputDir = path.dirname(OUTPUT_JSON_PATH);
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_JSON_PATH, JSON.stringify(cards, null, 2), 'utf-8');
    console.log(`✅ Conversion réussie ! ${cards.length} cartes générées dans ${OUTPUT_JSON_PATH}`);
}

convert().catch(console.error);