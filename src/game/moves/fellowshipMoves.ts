import type { LotrMoveContext } from '../types';

export const advanceCompany = (G: any) => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];
    if (!fpPlayer) {
        console.warn('❌ [moves.advanceCompany] Joueur FP introuvable !');
        return;
    }

    const nextIndex = fpPlayer.currentSiteIndex + 1;

    if (nextIndex >= 9) {
        console.warn("⚠️ [moves.advanceCompany] Index >= 9, impossible d'avancer.");
        return;
    }

    G.movesThisTurn = (G.movesThisTurn || 0) + 1;
    fpPlayer.currentSiteIndex = nextIndex;

    const targetSite = G.path[nextIndex];

    if (targetSite !== null) {
        const siteCost = Number(targetSite.twilightCost) || 0;
        const companionsCount = fpPlayer.fellowshipArea ? fpPlayer.fellowshipArea.length : 0;
        const totalAdded = siteCost + companionsCount;
        G.twilightPool += totalAdded;

        G.statusMessage = `La compagnie avance au site ${nextIndex + 1} : ${targetSite.name}`;
    } else {
        G.awaitingSiteSelection = true;
        G.statusMessage = "En attente du joueur de l'Ombre pour poser le prochain site...";
    }
};

export const revealCompanion = ({ G }: LotrMoveContext, companionId: string) => {
    const fpId = G.fpPlayerId || '0';
    const fpPlayer = G.players[fpId];

    if (!fpPlayer || !fpPlayer.fellowshipArea) {
        console.warn('❌ [moves.revealCompanion] Zone de communauté introuvable.');
        return 'INVALID_MOVE';
    }

    let found = false;
    fpPlayer.fellowshipArea = fpPlayer.fellowshipArea.map((card) => {
        const isTarget = card.id === companionId || (card as any).instanceId === companionId;
        if (isTarget) {
            found = true;
            return { ...card, isFaceDown: false };
        }
        return card;
    });

    if (!found) {
        console.warn(`⚠️ [moves.revealCompanion] Aucune carte ne correspond à l'ID ${companionId}`);
        return 'INVALID_MOVE';
    }

    G.statusMessage = `Une carte de la Communauté a été révélée !`;
};

export const playSite = (
    { G, ctx, events, playerID }: LotrMoveContext,
    siteId: string,
    targetIndex: number
) => {
    const fpId = G.fpPlayerId || '0';
    const shadowId = fpId === '0' ? '1' : '0';

    if (!G.awaitingSiteSelection) {
        console.warn(`❌ [moves.playSite] Rejet : Impossible de poser un site hors de l'avancée de la compagnie.`);
        return 'INVALID_MOVE';
    }

    const isFirstSite = targetIndex === 0;
    const expectedPlayerId = isFirstSite ? fpId : shadowId;

    if (playerID !== expectedPlayerId) {
        console.warn(`❌ [moves.playSite] Rejet : C'est au joueur ${expectedPlayerId} (${isFirstSite ? 'FP' : 'Ombre'}) de poser le site ${targetIndex + 1}.`);
        return 'INVALID_MOVE';
    }

    const player = G.players[playerID];
    if (!player || !player.sitesDeck) return 'INVALID_MOVE';

    const siteIndex = player.sitesDeck.findIndex((s) => s.id === siteId);
    if (siteIndex === -1) {
        console.warn(`❌ [moves.playSite] Site ${siteId} introuvable dans le deck de sites.`);
        return 'INVALID_MOVE';
    }

    const nextEmptyIndex = G.path.findIndex((slot) => slot === null);
    if (targetIndex !== nextEmptyIndex) {
        console.warn(`❌ [moves.playSite] Index cible ${targetIndex} ne correspond pas au prochain emplacement vide ${nextEmptyIndex}.`);
        return 'INVALID_MOVE';
    }

    const playedSite = player.sitesDeck[siteIndex];

    if (playedSite.siteNumber !== undefined && playedSite.siteNumber !== targetIndex + 1) {
        console.warn(`❌ [moves.playSite] Le site ${playedSite.name} (#${playedSite.siteNumber}) ne match pas l'emplacement ${targetIndex + 1}.`);
        return 'INVALID_MOVE';
    }

    player.sitesDeck.splice(siteIndex, 1);
    playedSite.ownerId = playerID;
    G.path[targetIndex] = playedSite;

    G.awaitingSiteSelection = false;
    const fpPlayer = G.players[fpId];

    if (fpPlayer) {
        fpPlayer.currentSiteIndex = targetIndex;
    }

    const siteCost = Number(playedSite.twilightCost) || 0;
    const companionsCount = fpPlayer?.fellowshipArea ? fpPlayer.fellowshipArea.length : 0;
    const addedTwilight = siteCost + companionsCount;
    G.twilightPool += addedTwilight;

    Object.keys(G.players).forEach((pId) => {
        const p = G.players[pId];
        if (p && p.fellowshipArea) {
            p.fellowshipArea = p.fellowshipArea.map((card) => ({
                ...card,
                isFaceDown: false,
            }));
        }
    });

    G.statusMessage = `Nouveau site révélé ! La compagnie avance en ${playedSite.name} (+${addedTwilight} Crépuscule). Révélation des compagnons.`;

    if (ctx.phase === 'fellowship') {
        if (events?.setPhase) {
            events.setPhase('shadow');
        }
    } else if (ctx.phase === 'regroup') {
        G.skirmishes = [];
        G.activeSkirmishId = undefined;

        if (events?.setPhase) {
            events.setPhase('shadow');
        }
    }
};

export const endFellowshipPhase = ({ G, ctx, events, playerID }: LotrMoveContext) => {
    const fpId = G.fpPlayerId || '0';
    const actingPlayerId = playerID ?? ctx.currentPlayer ?? '0';

    if (actingPlayerId !== fpId) {
        console.warn('❌ [moves.endFellowshipPhase] Rejet: Seul FP peut terminer Fellowship.');
        return 'INVALID_MOVE';
    }
    advanceCompany(G);

    if (!G.awaitingSiteSelection) {
        events?.setPhase?.('shadow');
    }
};

export const fellowshipMoves = {
    advanceCompany,
    revealCompanion,
    playSite,
    endFellowshipPhase,
};