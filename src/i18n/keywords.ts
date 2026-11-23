import type { SupportedLanguage } from './languages';
export type KeywordInfo = { label: string; description: string };

type KeywordEntry = {
    label: Record<SupportedLanguage, string>;
    description: Record<SupportedLanguage, string>;
};

const KEYWORDS: Record<string, KeywordEntry> = {
    'AID': {
        label: {
            fr: 'Aide',
            en: 'Aid',
            de: 'Hilfe',
            it: 'Aiuto',
            es: 'Ayuda',
        },
        description: {
            fr: 'Au début de la phase de manœuvre, vous pouvez payer le coût indiqué sur la carte pour attacher le suivant à un compagnon ou un séide jusqu\'à la phase de ralliement, et bénéficier de ses effets.',
            en: 'At the start of the maneuver phase, you may pay the cost on this card to attach the follower to a companion or minion until the regroup phase and gain its benefits.',
            de: 'Zu Beginn der Manöverphase darfst du die Kosten auf dieser Karte zahlen, um den Anhänger bis zur Sammelphase an einen Gefährten oder Diener anzulegen und seine Effekte zu nutzen.',
            it: 'All\'inizio della fase di manovra, puoi pagare il costo indicato per attaccare il seguace a un compagno o servitore fino alla fase di raduno e ottenere i suoi effetti.',
            es: 'Al inicio de la fase de maniobra, puedes pagar el coste indicado para adjuntar el seguidor a un compañero o esbirro hasta la fase de reagrupación y beneficiarte de sus efectos.',
        },
    },
    'AMBUSH 1': {
        label: {
            fr: 'Embuscade 1',
            en: 'Ambush 1',
            de: 'Hinterhalt 1',
            it: 'Imboscata 1',
            es: 'Emboscada 1',
        },
        description: {
            fr: '1 est ajouté à la réserve crépusculaire si le joueur des Peuples Libres affecte le séide avec ce mot-clé lors de la phase d\'affectation.',
            en: 'Add 1 to the twilight pool when the Free Peoples player assigns this minion during the assignment phase.',
            de: '1 wird dem Zwielichtvorrat hinzugefügt, wenn der Freie-Völker-Spieler diesen Diener in der Zuweisungsphase zuweist.',
            it: 'Aggiungi 1 alla riserva crepuscolare se i Popoli Liberi assegnano questo servitore durante la fase di assegnazione.',
            es: 'Añade 1 a la reserva crepuscular si los Pueblos Libres asignan a este esbirro durante la fase de asignación.',
        },
    },
    'AMBUSH 2': {
        label: {
            fr: 'Embuscade 2',
            en: 'Ambush 2',
            de: 'Hinterhalt 2',
            it: 'Imboscata 2',
            es: 'Emboscada 2',
        },
        description: {
            fr: '2 est ajouté à la réserve crépusculaire si le joueur des Peuples Libres affecte le séide avec ce mot-clé lors de la phase d\'affectation.',
            en: 'Add 2 to the twilight pool when the Free Peoples player assigns this minion during the assignment phase.',
            de: '2 wird dem Zwielichtvorrat hinzugefügt, wenn der Freie-Völker-Spieler diesen Diener in der Zuweisungsphase zuweist.',
            it: 'Aggiungi 2 alla riserva crepuscolare se i Popoli Liberi assegnano questo servitore durante la fase di assegnazione.',
            es: 'Añade 2 a la reserva crepuscular si los Pueblos Libres asignan a este esbirro durante la fase de asignación.',
        },
    },
    'AMBUSH 3': {
        label: {
            fr: 'Embuscade 3',
            en: 'Ambush 3',
            de: 'Hinterhalt 3',
            it: 'Imboscata 3',
            es: 'Emboscada 3',
        },
        description: {
            fr: '3 est ajouté à la réserve crépusculaire si le joueur des Peuples Libres affecte le séide avec ce mot-clé lors de la phase d\'affectation.',
            en: 'Add 3 to the twilight pool when the Free Peoples player assigns this minion during the assignment phase.',
            de: '3 wird dem Zwielichtvorrat hinzugefügt, wenn der Freie-Völker-Spieler diesen Diener in der Zuweisungsphase zuweist.',
            it: 'Aggiungi 3 alla riserva crepuscolare se i Popoli Liberi assegnano questo servitore durante la fase di assegnazione.',
            es: 'Añade 3 a la reserva crepuscular si los Pueblos Libres asignan a este esbirro durante la fase de asignación.',
        },
    },
    'AMBUSH 5': {
        label: {
            fr: 'Embuscade 5',
            en: 'Ambush 5',
            de: 'Hinterhalt 5',
            it: 'Imboscata 5',
            es: 'Emboscada 5',
        },
        description: {
            fr: '5 est ajouté à la réserve crépusculaire si le joueur des Peuples Libres affecte le séide avec ce mot-clé lors de la phase d\'affectation.',
            en: 'Add 5 to the twilight pool when the Free Peoples player assigns this minion during the assignment phase.',
            de: '5 wird dem Zwielichtvorrat hinzugefügt, wenn der Freie-Völker-Spieler diesen Diener in der Zuweisungsphase zuweist.',
            it: 'Aggiungi 5 alla riserva crepuscolare se i Popoli Liberi assegnano questo servitore durante la fase di assegnazione.',
            es: 'Añade 5 a la reserva crepuscular si los Pueblos Libres asignan a este esbirro durante la fase de asignación.',
        },
    },
    'ARCHER': {
        label: {
            fr: 'Archer',
            en: 'Archer',
            de: 'Bogenschütze',
            it: 'Arciere',
            es: 'Arquero',
        },
        description: {
            fr: 'Ce personnage augmente de 1 le total d\'archerie.',
            en: 'This character adds 1 to the archery total.',
            de: 'Dieser Charakter erhöht die Fernkampfsumme um 1.',
            it: 'Questo personaggio aumenta di 1 il totale di tiro.',
            es: 'Este personaje suma 1 al total de arquería.',
        },
    },
    'BATTLEGROUND': {
        label: {
            fr: 'Champ de Bataille',
            en: 'Battleground',
            de: 'Schlachtfeld',
            it: 'Campo di battaglia',
            es: 'Campo de batalla',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'BESIEGER': {
        label: {
            fr: 'Assiégeant',
            en: 'Besieger',
            de: 'Belagerer',
            it: 'Assediante',
            es: 'Asediador',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'CORSAIR': {
        label: {
            fr: 'Pirate',
            en: 'Corsair',
            de: 'Korsar',
            it: 'Corsaro',
            es: 'Corsario',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'DAMAGE': {
        label: {
            fr: 'Dégâts',
            en: 'Damage',
            de: 'Schaden',
            it: 'Danni',
            es: 'Daño',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'DAMAGE +1': {
        label: {
            fr: 'Dégâts + 1',
            en: 'Damage +1',
            de: 'Schaden +1',
            it: 'Danni +1',
            es: 'Daño +1',
        },
        description: {
            fr: 'Le personnage inflige 1 blessure supplémentaire en combat.',
            en: 'This character deals 1 additional wound in a skirmish.',
            de: 'Dieser Charakter fügt im Kampf 1 zusätzliche Wunde zu.',
            it: 'Questo personaggio infligge 1 ferita aggiuntiva in schermaglia.',
            es: 'Este personaje inflige 1 herida adicional en una escaramuza.',
        },
    },
    'DAMAGE +2': {
        label: {
            fr: 'Dégâts + 2',
            en: 'Damage +2',
            de: 'Schaden +2',
            it: 'Danni +2',
            es: 'Daño +2',
        },
        description: {
            fr: 'Le personnage inflige 2 blessures supplémentaires en combat.',
            en: 'This character deals 2 additional wounds in a skirmish.',
            de: 'Dieser Charakter fügt im Kampf 2 zusätzliche Wunden zu.',
            it: 'Questo personaggio infligge 2 ferite aggiuntive in schermaglia.',
            es: 'Este personaje inflige 2 heridas adicionales en una escaramuza.',
        },
    },
    'DAMAGE +3': {
        label: {
            fr: 'Dégâts + 3',
            en: 'Damage +3',
            de: 'Schaden +3',
            it: 'Danni +3',
            es: 'Daño +3',
        },
        description: {
            fr: 'Le personnage inflige 3 blessures supplémentaires en combat.',
            en: 'This character deals 3 additional wounds in a skirmish.',
            de: 'Dieser Charakter fügt im Kampf 3 zusätzliche Wunden zu.',
            it: 'Questo personaggio infligge 3 ferite aggiuntive in schermaglia.',
            es: 'Este personaje inflige 3 heridas adicionales en una escaramuza.',
        },
    },
    'DAMAGE +4': {
        label: {
            fr: 'Dégâts + 4',
            en: 'Damage +4',
            de: 'Schaden +4',
            it: 'Danni +4',
            es: 'Daño +4',
        },
        description: {
            fr: 'Le personnage inflige 4 blessures supplémentaires en combat.',
            en: 'This character deals 4 additional wounds in a skirmish.',
            de: 'Dieser Charakter fügt im Kampf 4 zusätzliche Wunden zu.',
            it: 'Questo personaggio infligge 4 ferite aggiuntive in schermaglia.',
            es: 'Este personaje inflige 4 heridas adicionales en una escaramuza.',
        },
    },
    'DEFENDER +1': {
        label: {
            fr: 'Défenseur + 1',
            en: 'Defender +1',
            de: 'Verteidiger +1',
            it: 'Difensore +1',
            es: 'Defensor +1',
        },
        description: {
            fr: 'Le personnage peut être affecté à 1 séide supplémentaire pendant la phase d\'affectation.',
            en: 'This character may be assigned to 1 additional minion during the assignment phase.',
            de: 'Dieser Charakter darf in der Zuweisungsphase 1 zusätzlichen Diener zugewiesen werden.',
            it: 'Questo personaggio può essere assegnato a 1 servitore aggiuntivo durante la fase di assegnazione.',
            es: 'Este personaje puede asignarse a 1 esbirro adicional durante la fase de asignación.',
        },
    },
    'DEFENDER +2': {
        label: {
            fr: 'Défenseur + 2',
            en: 'Defender +2',
            de: 'Verteidiger +2',
            it: 'Difensore +2',
            es: 'Defensor +2',
        },
        description: {
            fr: 'Le personnage peut être affecté à 2 séides supplémentaires pendant la phase d\'affectation.',
            en: 'This character may be assigned to 2 additional minions during the assignment phase.',
            de: 'Dieser Charakter darf in der Zuweisungsphase 2 zusätzlichen Dienern zugewiesen werden.',
            it: 'Questo personaggio può essere assegnato a 2 servitori aggiuntivi durante la fase di assegnazione.',
            es: 'Este personaje puede asignarse a 2 esbirros adicionales durante la fase de asignación.',
        },
    },
    'DEFENDER +3': {
        label: {
            fr: 'Défenseur + 3',
            en: 'Defender +3',
            de: 'Verteidiger +3',
            it: 'Difensore +3',
            es: 'Defensor +3',
        },
        description: {
            fr: 'Le personnage peut être affecté à 3 séides supplémentaires pendant la phase d\'affectation.',
            en: 'This character may be assigned to 3 additional minions during the assignment phase.',
            de: 'Dieser Charakter darf in der Zuweisungsphase 3 zusätzlichen Dienern zugewiesen werden.',
            it: 'Questo personaggio può essere assegnato a 3 servitori aggiuntivi durante la fase di assegnazione.',
            es: 'Este personaje puede asignarse a 3 esbirros adicionales durante la fase de asignación.',
        },
    },
    'DEFENDER +4': {
        label: {
            fr: 'Défenseur + 4',
            en: 'Defender +4',
            de: 'Verteidiger +4',
            it: 'Difensore +4',
            es: 'Defensor +4',
        },
        description: {
            fr: 'Le personnage peut être affecté à 4 séides supplémentaires pendant la phase d\'affectation.',
            en: 'This character may be assigned to 4 additional minions during the assignment phase.',
            de: 'Dieser Charakter darf in der Zuweisungsphase 4 zusätzlichen Dienern zugewiesen werden.',
            it: 'Questo personaggio può essere assegnato a 4 servitori aggiuntivi durante la fase di assegnazione.',
            es: 'Este personaje puede asignarse a 4 esbirros adicionales durante la fase de asignación.',
        },
    },
    'DWELLING': {
        label: {
            fr: 'Résidence',
            en: 'Dwelling',
            de: 'Wohnsitz',
            it: 'Dimora',
            es: 'Morada',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'EASTERLING': {
        label: {
            fr: 'Oriental',
            en: 'Easterling',
            de: 'Ostling',
            it: 'Orientale',
            es: 'Oriental',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'ENDURING': {
        label: {
            fr: 'Pugnace',
            en: 'Enduring',
            de: 'Zäh',
            it: 'Tenace',
            es: 'Resistente',
        },
        description: {
            fr: 'Pour chaque blessure sur ce personnage, il a + 2 en Force.',
            en: 'For each wound on this character, it is strength +2.',
            de: 'Für jede Wunde auf diesem Charakter hat er +2 Stärke.',
            it: 'Per ogni ferita su questo personaggio, ha +2 di forza.',
            es: 'Por cada herida en este personaje, tiene +2 de fuerza.',
        },
    },
    'ENGINE': {
        label: {
            fr: 'Engin',
            en: 'Engine',
            de: 'Maschine',
            it: 'Macchina',
            es: 'Máquina',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'FIERCE': {
        label: {
            fr: 'Acharné',
            en: 'Fierce',
            de: 'Grimmig',
            it: 'Feroce',
            es: 'Fiero',
        },
        description: {
            fr: 'Après la résolution de tous les combats, ce séide doit être affecté de nouveau à un personnage pour participer à un nouveau combat.',
            en: 'After all skirmishes resolve, this minion must be assigned again to a character to fight another skirmish.',
            de: 'Nachdem alle Kämpfe gelöst wurden, muss dieser Diener erneut einem Charakter zugewiesen werden, um einen weiteren Kampf zu bestreiten.',
            it: 'Dopo la risoluzione di tutte le schermaglie, questo servitore deve essere riassegnato a un personaggio per combatterne un\'altra.',
            es: 'Tras resolver todas las escaramuzas, este esbirro debe asignarse de nuevo a un personaje para librar otra escaramuza.',
        },
    },
    'FOREST': {
        label: {
            fr: 'Forêt',
            en: 'Forest',
            de: 'Wald',
            it: 'Foresta',
            es: 'Bosque',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'FORTIFICATION': {
        label: {
            fr: 'Fortification',
            en: 'Fortification',
            de: 'Befestigung',
            it: 'Fortificazione',
            es: 'Fortificación',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'HUNTER 1': {
        label: {
            fr: 'Chasseur 1',
            en: 'Hunter 1',
            de: 'Jäger 1',
            it: 'Cacciatore 1',
            es: 'Cazador 1',
        },
        description: {
            fr: 'Ce personnage a + 1 en Force s\'il combat un adversaire sans le mot-clé Chasseur.',
            en: 'This character is strength +1 while skirmishing a character without the Hunter keyword.',
            de: 'Dieser Charakter hat +1 Stärke, wenn er gegen einen Charakter ohne das Schlüsselwort Jäger kämpft.',
            it: 'Questo personaggio ha +1 di forza se combatte un avversario senza la parola chiave Cacciatore.',
            es: 'Este personaje tiene +1 de fuerza si combate a un adversario sin la palabra clave Cazador.',
        },
    },
    'HUNTER 2': {
        label: {
            fr: 'Chasseur 2',
            en: 'Hunter 2',
            de: 'Jäger 2',
            it: 'Cacciatore 2',
            es: 'Cazador 2',
        },
        description: {
            fr: 'Ce personnage a + 2 en Force s\'il combat un adversaire sans le mot-clé Chasseur.',
            en: 'This character is strength +2 while skirmishing a character without the Hunter keyword.',
            de: 'Dieser Charakter hat +2 Stärke, wenn er gegen einen Charakter ohne das Schlüsselwort Jäger kämpft.',
            it: 'Questo personaggio ha +2 di forza se combatte un avversario senza la parola chiave Cacciatore.',
            es: 'Este personaje tiene +2 de fuerza si combate a un adversario sin la palabra clave Cazador.',
        },
    },
    'HUNTER 3': {
        label: {
            fr: 'Chasseur 3',
            en: 'Hunter 3',
            de: 'Jäger 3',
            it: 'Cacciatore 3',
            es: 'Cazador 3',
        },
        description: {
            fr: 'Ce personnage a + 3 en Force s\'il combat un adversaire sans le mot-clé Chasseur.',
            en: 'This character is strength +3 while skirmishing a character without the Hunter keyword.',
            de: 'Dieser Charakter hat +3 Stärke, wenn er gegen einen Charakter ohne das Schlüsselwort Jäger kämpft.',
            it: 'Questo personaggio ha +3 di forza se combatte un avversario senza la parola chiave Cacciatore.',
            es: 'Este personaje tiene +3 de fuerza si combate a un adversario sin la palabra clave Cazador.',
        },
    },
    'HUNTER 4': {
        label: {
            fr: 'Chasseur 4',
            en: 'Hunter 4',
            de: 'Jäger 4',
            it: 'Cacciatore 4',
            es: 'Cazador 4',
        },
        description: {
            fr: 'Ce personnage a + 4 en Force s\'il combat un adversaire sans le mot-clé Chasseur.',
            en: 'This character is strength +4 while skirmishing a character without the Hunter keyword.',
            de: 'Dieser Charakter hat +4 Stärke, wenn er gegen einen Charakter ohne das Schlüsselwort Jäger kämpft.',
            it: 'Questo personaggio ha +4 di forza se combatte un avversario senza la parola chiave Cacciatore.',
            es: 'Este personaje tiene +4 de fuerza si combate a un adversario sin la palabra clave Cazador.',
        },
    },
    'KNIGHT': {
        label: {
            fr: 'Chevalier',
            en: 'Knight',
            de: 'Ritter',
            it: 'Cavaliere',
            es: 'Caballero',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'LURKER': {
        label: {
            fr: 'Embusqué',
            en: 'Lurker',
            de: 'Lauerer',
            it: 'Agguato',
            es: 'Acechador',
        },
        description: {
            fr: 'Les combats impliquant des séides avec ce mot-clé doivent être résolus en dernier.',
            en: 'Skirmishes involving minions with this keyword must be resolved last.',
            de: 'Kämpfe mit Dienern dieses Schlüsselworts müssen zuletzt gelöst werden.',
            it: 'Le schermaglie con servitori con questa parola chiave devono essere risolte per ultime.',
            es: 'Las escaramuzas con esbirros con esta palabra clave deben resolverse al final.',
        },
    },
    'MACHINE': {
        label: {
            fr: 'Machine',
            en: 'Machine',
            de: 'Gerät',
            it: 'Apparato',
            es: 'Aparato',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'MARSH': {
        label: {
            fr: 'Marais',
            en: 'Marsh',
            de: 'Sumpf',
            it: 'Palude',
            es: 'Pantano',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'MOUNTAIN': {
        label: {
            fr: 'Montagne',
            en: 'Mountain',
            de: 'Gebirge',
            it: 'Montagna',
            es: 'Montaña',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'MUSTER': {
        label: {
            fr: 'Rassembleur',
            en: 'Muster',
            de: 'Muster',
            it: 'Raduno',
            es: 'Recluta',
        },
        description: {
            fr: 'Au début de la phase de Ralliement, chaque joueur peut défausser un nombre de cartes égal au nombre de personnages Rassembleurs qu\'ils possèdent, puis piocher le même nombre de cartes.',
            en: 'At the start of the regroup phase, each player may discard a number of cards equal to the number of Muster characters they control, then draw that many cards.',
            de: 'Zu Beginn der Sammelphase darf jeder Spieler Karten in Höhe der Anzahl seiner Muster-Charaktere ablegen und ebenso viele ziehen.',
            it: 'All\'inizio della fase di raduno, ogni giocatore può scartare un numero di carte pari ai personaggi Raduno che controlla, poi pescarne altrettante.',
            es: 'Al inicio de la fase de reagrupación, cada jugador puede descartar tantas cartas como personajes Recluta controle, y luego robar esa misma cantidad.',
        },
    },
    'PIPEWEED': {
        label: {
            fr: 'Herbe à pipe',
            en: 'Pipeweed',
            de: 'Pfeifenkraut',
            it: 'Erba da pipa',
            es: 'Hierba de pipa',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'PLAINS': {
        label: {
            fr: 'Plaines',
            en: 'Plains',
            de: 'Ebene',
            it: 'Pianure',
            es: 'Llanuras',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'RANGER': {
        label: {
            fr: 'Rôdeur',
            en: 'Ranger',
            de: 'Waldläufer',
            it: 'Ramingo',
            es: 'Montaraz',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'RING-BEARER': {
        label: {
            fr: 'Porteur de l\'Anneau',
            en: 'Ring-bearer',
            de: 'Ringträger',
            it: 'Portatore dell\'Anello',
            es: 'Portador del Anillo',
        },
        description: {
            fr: 'Ce personnage peut porter l\'Anneau Unique.',
            en: 'This character may bear The One Ring.',
            de: 'Dieser Charakter darf den Einen Ring tragen.',
            it: 'Questo personaggio può portare l\'Unico Anello.',
            es: 'Este personaje puede portar el Anillo Único.',
        },
    },
    'RING-BOUND': {
        label: {
            fr: 'Associé à l\'Anneau',
            en: 'Ring-bound',
            de: 'Ringgebunden',
            it: 'Legato all\'Anello',
            es: 'Vinculado al Anillo',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'RIVER': {
        label: {
            fr: 'Rivière',
            en: 'River',
            de: 'Fluss',
            it: 'Fiume',
            es: 'Río',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'SANCTUARY': {
        label: {
            fr: 'Sanctuaire',
            en: 'Sanctuary',
            de: 'Zuflucht',
            it: 'Santuario',
            es: 'Santuario',
        },
        description: {
            fr: 'Au début de la phase de Compagnie, si la compagnie est à un site Sanctuaire, soignez jusqu\'à 5 blessures sur vos compagnons.',
            en: 'At the start of the fellowship phase, if the fellowship is at a Sanctuary site, heal up to 5 wounds from your companions.',
            de: 'Zu Beginn der Gemeinschaftsphase, wenn die Gemeinschaft an einem Zufluchtsort ist, heile bis zu 5 Wunden von deinen Gefährten.',
            it: 'All\'inizio della fase di Compagnia, se la compagnia è a un sito Santuario, cura fino a 5 ferite dai tuoi compagni.',
            es: 'Al inicio de la fase de Comunidad, si la comunidad está en un sitio Santuario, cura hasta 5 heridas de tus compañeros.',
        },
    },
    'SEARCH': {
        label: {
            fr: 'Recherche',
            en: 'Search',
            de: 'Suche',
            it: 'Ricerca',
            es: 'Búsqueda',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'SOUTHRON': {
        label: {
            fr: 'Suderon',
            en: 'Southron',
            de: 'Südländer',
            it: 'Sudrone',
            es: 'Sureño',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'SPELL': {
        label: {
            fr: 'Sort',
            en: 'Spell',
            de: 'Zauber',
            it: 'Incantesimo',
            es: 'Hechizo',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'STEALTH': {
        label: {
            fr: 'Dissimulation',
            en: 'Stealth',
            de: 'Heimlichkeit',
            it: 'Furtività',
            es: 'Sigilo',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'TALE': {
        label: {
            fr: 'Récit',
            en: 'Tale',
            de: 'Erzählung',
            it: 'Racconto',
            es: 'Relato',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'TENTACLE': {
        label: {
            fr: 'Tentacule',
            en: 'Tentacle',
            de: 'Tentakel',
            it: 'Tentacolo',
            es: 'Tentáculo',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'TOIL 1': {
        label: {
            fr: 'Éreintement 1',
            en: 'Toil 1',
            de: 'Mühsal 1',
            it: 'Fatica 1',
            es: 'Afán 1',
        },
        description: {
            fr: 'Pour chaque personnage différent (de la même culture que la carte avec Éreintement) affaibli, le coût de la carte est réduit de 1.',
            en: 'For each different character (of the same culture as this card) you exert, the twilight cost of this card is −1.',
            de: 'Für jeden unterschiedlichen Charakter (derselben Kultur wie diese Karte), den du schwächst, sinkt die Zwielichtkosten dieser Karte um 1.',
            it: 'Per ogni personaggio diverso (della stessa cultura di questa carta) che affatichi, il costo crepuscolare di questa carta è −1.',
            es: 'Por cada personaje distinto (de la misma cultura que esta carta) que agotes, el coste crepuscular de esta carta se reduce en 1.',
        },
    },
    'TOIL 2': {
        label: {
            fr: 'Éreintement 2',
            en: 'Toil 2',
            de: 'Mühsal 2',
            it: 'Fatica 2',
            es: 'Afán 2',
        },
        description: {
            fr: 'Pour chaque personnage différent (de la même culture que la carte avec Éreintement) affaibli, le coût de la carte est réduit de 2.',
            en: 'For each different character (of the same culture as this card) you exert, the twilight cost of this card is −2.',
            de: 'Für jeden unterschiedlichen Charakter (derselben Kultur wie diese Karte), den du schwächst, sinkt die Zwielichtkosten dieser Karte um 2.',
            it: 'Per ogni personaggio diverso (della stessa cultura di questa carta) che affatichi, il costo crepuscolare di questa carta è −2.',
            es: 'Por cada personaje distinto (de la misma cultura que esta carta) que agotes, el coste crepuscular de esta carta se reduce en 2.',
        },
    },
    'TOIL 3': {
        label: {
            fr: 'Éreintement 3',
            en: 'Toil 3',
            de: 'Mühsal 3',
            it: 'Fatica 3',
            es: 'Afán 3',
        },
        description: {
            fr: 'Pour chaque personnage différent (de la même culture que la carte avec Éreintement) affaibli, le coût de la carte est réduit de 3.',
            en: 'For each different character (of the same culture as this card) you exert, the twilight cost of this card is −3.',
            de: 'Für jeden unterschiedlichen Charakter (derselben Kultur wie diese Karte), den du schwächst, sinkt die Zwielichtkosten dieser Karte um 3.',
            it: 'Per ogni personaggio diverso (della stessa cultura di questa carta) che affatichi, il costo crepuscolare di questa carta è −3.',
            es: 'Por cada personaje distinto (de la misma cultura que esta carta) que agotes, el coste crepuscular de esta carta se reduce en 3.',
        },
    },
    'TRACKER': {
        label: {
            fr: 'Traqueur',
            en: 'Tracker',
            de: 'Fährtenleser',
            it: 'Inseguitore',
            es: 'Rastreador',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'TWILIGHT': {
        label: {
            fr: 'Crépusculaire',
            en: 'Twilight',
            de: 'Zwielicht',
            it: 'Crepuscolare',
            es: 'Crepuscular',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'UNBOUND': {
        label: {
            fr: 'Dissocié',
            en: 'Unbound',
            de: 'Ungebunden',
            it: 'Slegato',
            es: 'Desvinculado',
        },
        description: {
            fr: 'Un compagnon ou un allié est dissocié s\'il n\'est pas ring-bound et n\'est pas le Porteur. Ce n\'est pas un mot-clé imprimé.',
            en: 'A companion or ally is unbound if it is not ring-bound and is not the Ring-bearer. This is not a printed keyword.',
            de: 'Ein Gefährte oder Verbündeter ist ungebunden, wenn er nicht ringgebunden und nicht der Ringträger ist. Dies ist kein gedrucktes Schlüsselwort.',
            it: 'Un compagno o alleato è slegato se non è legato all\'Anello e non è il Portatore. Non è una parola chiave stampata.',
            es: 'Un compañero o aliado está desvinculado si no está vinculado al Anillo y no es el Portador. No es una palabra clave impresa.',
        },
    },
    'UNDERGROUND': {
        label: {
            fr: 'Souterrain',
            en: 'Underground',
            de: 'Unterirdisch',
            it: 'Sotterraneo',
            es: 'Subterráneo',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'UNHASTY': {
        label: {
            fr: 'Peu hâtif',
            en: 'Unhasty',
            de: 'Bedächtig',
            it: 'Poco frettoloso',
            es: 'Pausado',
        },
        description: {
            fr: 'Ce personnage ne peut pas être affecté à un combat, sauf si un effet l\'y autorise (souvent une capacité d\'affectation).',
            en: 'This character cannot be assigned to a skirmish unless an effect allows it (often an assignment ability).',
            de: 'Dieser Charakter darf keinem Kampf zugewiesen werden, es sei denn, ein Effekt erlaubt es (oft eine Zuweisungsfähigkeit).',
            it: 'Questo personaggio non può essere assegnato a una schermaglia, salvo se un effetto lo consente (spesso un\'abilità di assegnazione).',
            es: 'Este personaje no puede asignarse a una escaramuza salvo que un efecto lo permita (a menudo una habilidad de asignación).',
        },
    },
    'VALIANT': {
        label: {
            fr: 'Vaillant',
            en: 'Valiant',
            de: 'Tapfer',
            it: 'Valoroso',
            es: 'Valiente',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'VILLAGER': {
        label: {
            fr: 'Villageois',
            en: 'Villager',
            de: 'Dorfbewohner',
            it: 'Villico',
            es: 'Aldeano',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'WARG-RIDER': {
        label: {
            fr: 'Chevaucheur de ouague',
            en: 'Warg-rider',
            de: 'Wargreiter',
            it: 'Cavaliere di uargo',
            es: 'Jinete de huargo',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
    'WEATHER': {
        label: {
            fr: 'Climat',
            en: 'Weather',
            de: 'Wetter',
            it: 'Clima',
            es: 'Clima',
        },
        description: {
            fr: 'Mot-clé générique, sans effet particulier. Il peut être désigné par d\'autres cartes pour déclencher des effets.',
            en: 'Generic keyword with no special rules. Other cards may spot it to trigger effects.',
            de: 'Allgemeines Schlüsselwort ohne besondere Wirkung. Andere Karten können es benennen, um Effekte auszulösen.',
            it: 'Parola chiave generica, senza effetti particolari. Altre carte possono individuarla per attivare effetti.',
            es: 'Palabra clave genérica, sin efecto especial. Otras cartas pueden designarla para activar efectos.',
        },
    },
};

function resolveKey(keyword: string): string {
    if (KEYWORDS[keyword]) return keyword;
    const base = keyword.replace(/[0-9.,+]/g, '').trim();
    if (KEYWORDS[base]) return base;
    return keyword;
}

export function getKeywordInfo(
    keyword: string,
    lang: SupportedLanguage = 'fr'
): KeywordInfo | null {
    const key = resolveKey(keyword);
    const entry = KEYWORDS[key];
    if (!entry) return null;
    const L = lang in entry.label ? lang : 'fr';
    return {
        label: entry.label[L] ?? entry.label.fr,
        description: entry.description[L] ?? entry.description.fr,
    };
}

export function getKeywordLabel(
    keyword: string,
    lang: SupportedLanguage = 'fr'
): string {
    return getKeywordInfo(keyword, lang)?.label ?? keyword;
}

