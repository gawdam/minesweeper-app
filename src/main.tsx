// Learn more at developers.reddit.com/docs
import { Devvit, useState } from '@devvit/public-api';
import { createForm } from './forms/menuForm.js';

Devvit.configure({
  redditAPI: true,
});

// Game state interface for type safety
interface GameState {
  size: number;
  minePosition: number;
  tileStates: (boolean | null)[];
  score: number;
  gameOver: boolean;
  gameWon: boolean;
}

// Add a menu item to the subreddit menu for instantiating the new experience post
Devvit.addMenuItem({
  label: 'Create a new mine field!',
  location: 'subreddit',
  onPress: (_event, context) => {
    context.ui.showForm(createForm);
  },
});

// Define the confirmation form
const confirmationForm = Devvit.createForm({
  title: 'Confirmation',
  description: 'Please make a selection:',
  acceptLabel: 'Yes',
  cancelLabel: 'No',
  fields: [],
}, 
async (_event, { ui }) => {
  console.log("Confirmation form submitted");
  console.log(_event.values.cancelled);
  return _event.values.cancelled;
}
);

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Experience Post',
  height: 'regular',
  
  render: ({redis, postId, userId, ui}) => {
    // Get a unique key for this user's game state
    const userGameStateKey = userId ? `${postId}_game_${userId}` : null;
    
    // Use useState with an async initializer to fetch the grid size and game state
    const [gameData] = useState<{ size: number;minePosition:number; tileStates: boolean[]; score:number; } | null>(async () => {
      const formGridSize = await redis.get(`${postId}_gridSize`);
      const minePosition = await redis.get(`${postId}_minePosition`).then((value) => parseInt(value!));

      const size = formGridSize ? parseInt(formGridSize) : 3;
      console.log(`Loaded gridSize: ${size}`);
      
      // Try to load existing game state for this user
      if (userGameStateKey) {
        const savedGameState = await redis.get(userGameStateKey);
        if (savedGameState) {
          console.log("Loading saved game state");
          return JSON.parse(savedGameState) as GameState;
        }
      }
      
      // No saved state, initialize a new game
      console.log("Creating new game state");

      
      return {
        size,
        minePosition,
        tileStates: Array(size * size).fill(null), // null = untouched, true = safe, false = mine
        score: 0,
        gameOver: false,
        gameWon: false
      };
    });
    
    // Create states from game data
    const [tileStates, setTileStates] = useState(gameData ? gameData.tileStates : []);
    const [score, setScore] = useState(gameData ? gameData.score : 0);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    
    // Function to save game state to Redis
    const saveGameState = async (updatedTileStates: boolean[], updatedScore: number, isGameOver: boolean, isGameWon: boolean) => {
      if (!gameData || !userGameStateKey) return;
      
      const stateToSave: GameState = {
        ...gameData,
        tileStates: updatedTileStates,
        score: updatedScore,
        gameOver: isGameOver,
        gameWon: isGameWon
      };
      
      redis.set(userGameStateKey, JSON.stringify(stateToSave));
      console.log("Game state saved");
    };
    
    // Function to handle tile press
    const handleTilePress = async (index: number) => {
      if (!gameData || gameOver || gameWon || tileStates[index] !== null) {
        return; // Ignore if game is over or tile already revealed
      }
      
      // Check if clicked on mine
      if (index === gameData.minePosition) {
        // Create new state arrays to pass to saveGameState
        const newTileStates = [...tileStates];
        newTileStates[index] = false; // false = mine
        
        setTileStates(newTileStates);
        setGameOver(true);
        
        // Save updated state with the new arrays
        saveGameState(newTileStates, score, true, false);
      } else {
        // Safe tile
        const newTileStates = [...tileStates];
        newTileStates[index] = true; // true = safe
        
        const newScore = score + 2;
        
        setTileStates(newTileStates);
        setScore(newScore);
        
        // Check if all safe tiles are revealed (win condition)
        const safeTilesCount = gameData.size * gameData.size - 1; // All tiles except the mine
        const revealedSafeTiles = newTileStates.filter(state => state === true).length; // Count revealed safe tiles
        
        const isWon = revealedSafeTiles >= safeTilesCount;
        if (isWon) {
          setGameWon(true);
        }
        
        // Save updated state with the new arrays
        saveGameState(newTileStates, newScore, false, isWon);
      }
    };

    
    const promptDevilOrAngel =  () => {
      console.log("Prompting devil or angel");
      ui.showForm(confirmationForm);
      

    };
    
    // Reset game function
    const resetGame = async () => {
      if (!gameData || !userGameStateKey) return;
      
      // Generate new mine position
      const newMinePosition = Math.floor(Math.random() * (gameData.size * gameData.size));
      
      // Reset states
      const newTileStates = Array(gameData.size * gameData.size).fill(null);
      setTileStates(newTileStates);
      setScore(0);
      setGameOver(false);
      setGameWon(false);
      
      // Update gameData mine position
      gameData.minePosition = newMinePosition;
      
      // Save reset state
      const stateToSave: GameState = {
        ...gameData,
        tileStates: newTileStates,
        score: 0,
        gameOver: false,
        gameWon: false,
        minePosition: newMinePosition
      };
      
      redis.set(userGameStateKey, JSON.stringify(stateToSave));
      console.log("Game reset and saved");
    };
    
    // If gameData is not yet loaded, show loading state
    if (!gameData) {
      return <vstack alignment="center middle" height="100%" width="100%">
        <text>Loading...</text>
      </vstack>;
    }
    
    // Create the grid
    const renderGrid = () => {
      const rows = [];
      const size = gameData.size;
      
      for (let i = 0; i < size; i++) {
        const tiles = [];
        
        for (let j = 0; j < size; j++) {
          const index = i * size + j;
          
          // Determine tile color
          let tileColor = "grey"; // Default untouched
          if (tileStates[index] === true) {
            tileColor = "green"; // Safe tile
          } else if (tileStates[index] === false) {
            tileColor = "red"; // Mine
          }
          
          tiles.push(
            <hstack 
              key={`tile-${index}`}
              width="60px" 
              height="60px" 
              backgroundColor={tileColor}
              borderColor="white"
              onPress={() => handleTilePress(index)}
            />
          );
        }
        
        rows.push(
          <hstack key={`row-${i}`} gap='medium'>
            {tiles}
          </hstack>
        );
      }
      
      return rows;
    };

    // Fixed promptDevilOrAngel function - now using the ui parameter passed into render

    
    // Render the game status
    const renderStatus = () => {
      if (gameOver) {
        return <text alignment="center" color="white" weight="bold">Game Over! You hit a mine.</text>;
      } else if (gameWon) {
        return <text alignment="center" color="white" weight="bold">You Win! All safe tiles revealed.</text>;
      } else {
        return <text alignment="center" color="white" weight="bold">Score: {score}</text>;
      }
    };
  
    // For non-logged in users, show a message
    if (!userGameStateKey) {
      return (
        <vstack height="100%" width="100%" gap="medium" alignment="center middle">
          <text>Please log in to play and save your game progress.</text>
        </vstack>
      );
    }
  
    return (
      <vstack height="100%" width="100%" gap="medium" alignment="center middle">
        <vstack gap="large">
          {renderStatus()}
          <vstack height="80%" width="100%" gap="medium">
            {renderGrid()}
          </vstack>
          {(gameOver || gameWon) && 
            <button onPress={promptDevilOrAngel}>
              Play Again
            </button>
          }
        </vstack>
      </vstack>
    );
  }
});

export default Devvit;