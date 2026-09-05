import fs from 'fs';
import path from 'path';
import {
    CSV_PATH,
    OUTPUT_CARDS_PATH,
    OUTPUT_SITES_PATH,
    FEMALE_TITLES,
    SHADOW_CULTURES,
} from './constants.ts';
import {
    parseCsvContent,
    mapCulture,
    parseSignet,
    parseStat,
    buildLangBlock,
    parseGrantsKeywords,
    parseKeywords,
    parseClassAndPhases,
    parseAttachedTo,
    parseToPlayConditions,
    parseAidCost,
    parseAbilities,
} from './parsers.ts';

async function convert() {
    console.log('🔄 Lecture et traitement du CSV des cartes...');

    if (!fs.existsSync(CSV_PATH)) {
        console.error(`❌ Fichier introuvable : ${CSV_PATH}`);
        return;
    }

    const buffer = fs.readFileSync(CSV_PATH);
    const decoder = new TextDecoder('windows-1252');
    let fileContent = decoder.decode(buffer);

    if (fileContent.charCodeAt(0) === 0xfeff) {
        fileContent = fileContent.slice(1);
    }

    const allRows = parseCsvContent(fileContent);
    if (allRows.length === 0) {
        console.error('❌ Le fichier CSV est vide !');
        return;
    }

    const headers = allRows[0].map((h) => h.trim());
    const cardMap = new Map();
    const siteMap = new Map();

    for (let i = 1; i < allRows.length; i++) {
        const row = allRows[i];
        if (row.length < 2) continue;

        const data: Record<string, string> = {};
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
            const existingTextLen = (
                existing.i18n?.fr?.gameText ||
                existing.i18n?.en?.gameText ||
                ''
            ).length;
            const newTextLen = (frenchText || englishText).length;
            if (newTextLen <= existingTextLen) continue;
        }

        const culture = mapCulture(data['Culture']);
        const background = (data['Background'] || '').trim();

        let kind = 'FREE_PEOPLE';
        if (culture && SHADOW_CULTURES.includes(culture)) {
            kind = 'SHADOW';
        } else if (culture === 'GOLLUM') {
            kind = background.toLowerCase().startsWith('gollum_')
                ? 'SHADOW'
                : 'FREE_PEOPLE';
        }
        if (isSite) kind = 'SITE';

        const titleVO = (data['Title'] || '').trim();
        const bottomIcon = (data['Bottom Icon'] || '').trim();
        const isRingbearer =
            bottomIcon === 'Icon_ringbearer' ||
            titleVO.toLowerCase() === 'frodo';
        const isFemale = FEMALE_TITLES.has(titleVO) ? true : undefined;
        const rawImageCode = (data['Image'] || '').trim();
        const imageUrl = rawImageCode
            ? `/cards_visuals/o_${rawImageCode}.jpg`
            : undefined;

        const { subtype, phases, actionPhases } = parseClassAndPhases(
            data['Class'],
            englishText,
            type
        );
        const keywords = parseKeywords(
            englishText,
            titleVO,
            type,
            isRingbearer
        );
        const attachmentData = parseAttachedTo(englishText, type);

        const computedStrength = parseStat(data['Strength'], data['Top Text']);
        const computedVitality = parseStat(
            data['Vitality'],
            data['Middle Text']
        );
        const computedResistance = parseStat(
            data['Resistance'],
            data['Bottom Text']
        );
        const toPlayData = parseToPlayConditions(englishText);
        const grantsKeywords = parseGrantsKeywords(englishText);
        const aidCost = type === 'FOLLOWER' ? parseAidCost(englishText) : undefined;
        const abilities = isSite
            ? undefined
            : parseAbilities(englishText, titleVO, cardId);

        const cardObj: any = {
            id: cardId,
            set: parseInt(data['Set'], 10) || 0,
            rarity: data['Rarity'] || undefined,
            isUnique: data['Unique'] === '1',
            canBeRingbearer: isRingbearer ? true : undefined,
            isFemale: isFemale,
            kind: kind,
            type: type,
            subtype: subtype,
            keywords: keywords,
            aidCost: aidCost,
            grantsKeywords: grantsKeywords,
            attachedTo: attachmentData || undefined,
            toPlay: toPlayData,
            abilities: abilities,
            phases: phases,
            actionPhases: actionPhases,
            culture: culture,
            race: data['Race'] ? data['Race'].toUpperCase() : undefined,
            signet: parseSignet(bottomIcon),
            twilightCost:
                data['Twilight Cost'] !== ''
                    ? parseInt(data['Twilight Cost'], 10)
                    : 0,
            strength: computedStrength,
            vitality: computedVitality,
            resistance: computedResistance,
            minionSiteNumber:
                data['Minion Site Number'] !== ''
                    ? parseInt(data['Minion Site Number'], 10)
                    : undefined,
            allyHomeSites: data['Ally Home Sites'] || undefined,
            siteNumber:
                data['Site Number'] !== ''
                    ? parseInt(data['Site Number'], 10)
                    : undefined,
            siteArrow: data['Site Arrow'] || undefined,
            imageUrl: imageUrl,
            i18n: {
                en: buildLangBlock(
                    data['Title'],
                    data['Subtitle'],
                    data['Text'],
                    data['Lore']
                ),
                fr: buildLangBlock(
                    data['French Title'],
                    data['French Subtitle'],
                    data['French Text'],
                    data['French Lore']
                ),
                de: buildLangBlock(
                    data['German Title'],
                    data['German Subtitle'],
                    data['German Text'],
                    data['German Lore']
                ),
                it: buildLangBlock(
                    data['Italian Title'],
                    data['Italian Subtitle'],
                    data['Italian Text'],
                    data['Italian Lore']
                ),
                es: buildLangBlock(
                    data['Spanish Title'],
                    data['Spanish Subtitle'],
                    data['Spanish Text'],
                    data['Spanish Lore']
                ),
            },
        };

        Object.keys(cardObj.i18n).forEach((lang) => {
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
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(
        OUTPUT_CARDS_PATH,
        JSON.stringify(cardsArray, null, 2),
        'utf-8'
    );
    fs.writeFileSync(
        OUTPUT_SITES_PATH,
        JSON.stringify(sitesArray, null, 2),
        'utf-8'
    );

    console.log(`✅ Conversion réussie !`);
    console.log(`🃏 Cartes : ${cardsArray.length} -> ${OUTPUT_CARDS_PATH}`);
    console.log(`🏞️ Sites  : ${sitesArray.length} -> ${OUTPUT_SITES_PATH}`);
}

convert().catch(console.error);
