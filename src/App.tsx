import { Client } from 'boardgame.io/react';
import { LotrGame } from './game/Game';
import { GameBoard } from './views/GameBoard';

// On configure le client boardgame.io
const LotrClient = Client({
    game: LotrGame, // Notre logique de jeu et ses phases
    board: GameBoard, // Notre composant React d'affichage
    numPlayers: 2, // Le nombre de joueurs (ex: Joueur 1 Peuple Libre, Joueur 2 Ombre)
});

function App() {
    return (
        <div className="App">
            <LotrClient />
        </div>
    );
}

export default App;
