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
  tileVotes: number[];
  score: number;
  gameOver: boolean;
  gameWon: boolean;
  theme: string; // Add theme to game state
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
});

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Experience Post',
  height: 'regular',
  
  render: ({redis, postId, userId, ui}) => {
    // Get a unique key for this user's game state
    const userGameStateKey = userId ? `${postId}_game_${userId}` : null;
    
    // Use useState with an async initializer to fetch the grid size and game state
    const [gameData] = useState<{ size: number;minePosition:number; tileStates: boolean[]; tileVotes: number[]; score:number; theme:string; }  | null>(async () => {
      const formGridSize = await redis.get(`u${postId}_gridSize`);
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
        tileVotes: Array(size * size).fill(0),
        score: 0,
        gameOver: false,
        gameWon: false,
        theme: "dark" // Default theme
      };
    });
    
    // Create states from game data
    const [tileStates, setTileStates] = useState(gameData ? gameData.tileStates : []);
    const [tileVotes, setTileVotes] = useState(gameData ? gameData.tileVotes : []);
    const [score, setScore] = useState(gameData ? gameData.score : 0);
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [theme, setTheme] = useState(gameData ? gameData.theme : "dark");
    
    // Theme colors
    const themeColors = {
      dark: {
        background: "#121212",
        tile: {
          untouched: "#2C2C2C",
          safe: "#1E4620", // Dark green
          mine: "#6E1B1B"  // Dark red
        },
        text: "#FFFFFF",
        border: "#3D3D3D",
        button: "#383838",
        buttonText: "#FFFFFF",
        iconColor: "#FF4500" // Reddit's orangered color
      },
      light: {
        background: "#FFFFFF",
        tile: {
          untouched: "#E0E0E0",
          safe: "#A5D6A7", // Light green
          mine: "#FFCDD2"  // Light red
        },
        text: "#121212",
        border: "#CCCCCC",
        button: "#F5F5F5",
        buttonText: "#121212",
        iconColor: "#FF4500" // Reddit's orangered color
      }
    };
    
    // Get current theme colors
    const colors = theme === "dark" ? themeColors.dark : themeColors.light;
    
    // Toggle theme function
    const toggleTheme = () => {
      const newTheme = theme === "dark" ? "light" : "dark";
      setTheme(newTheme);
      
      if (gameData && userGameStateKey) {
        const updatedGameData = { ...gameData, theme: newTheme };
        redis.set(userGameStateKey, JSON.stringify(updatedGameData));
        console.log(`Theme switched to ${newTheme}`);
      }
    };
    
    // Function to save game state to Redis
    const saveGameState = async (updatedTileStates: boolean[], updatedTileVotes: number[], updatedScore: number, isGameOver: boolean, isGameWon: boolean) => {
      if (!gameData || !userGameStateKey) return;
      
      const stateToSave: GameState = {
        ...gameData,
        tileStates: updatedTileStates,
        tileVotes: updatedTileVotes,
        score: updatedScore,
        gameOver: isGameOver,
        gameWon: isGameWon,
        theme: theme
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
        saveGameState(newTileStates, tileVotes, score, true, false);
      } else {
        // Safe tile
        const newTileStates = [...tileStates];
        const newTileVotes = [...tileVotes];

        newTileStates[index] = true; // true = safe
        newTileVotes[index] += 1;
        
        const newScore = score + 2;
        
        setTileStates(newTileStates);
        setTileVotes(newTileVotes);
        setScore(newScore);
        
        // Check if all safe tiles are revealed (win condition)
        const safeTilesCount = gameData.size * gameData.size - 1; // All tiles except the mine
        const revealedSafeTiles = newTileStates.filter(state => state === true).length; // Count revealed safe tiles
        
        const isWon = revealedSafeTiles >= safeTilesCount;
        if (isWon) {
          setGameWon(true);
        }
        
        // Save updated state with the new arrays
        saveGameState(newTileStates, newTileVotes, newScore, false, isWon);
      }
    };

    const promptDevilOrAngel = () => {
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
      const newTileVotes = Array(gameData.size * gameData.size).fill(0);
      setTileVotes(newTileVotes);
      setScore(0);
      setGameOver(false);
      setGameWon(false);
      
      // Update gameData mine position
      gameData.minePosition = newMinePosition;
      
      // Save reset state
      const stateToSave: GameState = {
        ...gameData,
        tileStates: newTileStates,
        tileVotes: newTileVotes,
        score: 0,
        gameOver: false,
        gameWon: false,
        minePosition: newMinePosition,
        theme: theme
      };
      
      redis.set(userGameStateKey, JSON.stringify(stateToSave));
      console.log("Game reset and saved");
    };
    
    // If gameData is not yet loaded, show loading state
    if (!gameData) {
      return <vstack alignment="center middle" height="100%" width="100%" backgroundColor={colors.background}>
        <text color={colors.text}>Loading...</text>
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
          
          // Determine tile color based on state and theme
          let tileColor;
          if (tileStates[index] === true) {
            tileColor = colors.tile.safe; // Safe tile
          } else if (tileStates[index] === false) {
            tileColor = colors.tile.mine; // Mine
          } else {
            tileColor = colors.tile.untouched; // Untouched
          }
          
          tiles.push(
            <zstack 
              key={`tile-${index}`}
              width="60px" 
              height="60px"
              borderColor={colors.border}
              onPress={() => handleTilePress(index)}
              alignment="center middle"
            >
              {/* Background image */}
              <image 
                url="tile.jpg" 
                imageWidth={60} 
                imageHeight={60} 
                width="100%" 
                height="100%" 
                resizeMode="cover"
              />
              
              {/* Colored overlay for visibility */}
              {/* <hstack 
                width="100%" 
                height="100%" 
                backgroundColor={tileColor} 
             
                alignment="center middle"
              /> */}
              
              {/* Content */}
              <vstack alignment="center">
                <hstack alignment="center middle" gap="small">
                    <image 
                    url="explosion.png" 
                    imageWidth={12} 
                    imageHeight={12} 
                    width="10%" 
                    height="10%" 
                    resizeMode="cover"
                  />
                  <text color={colors.text} weight="bold">
                    {tileVotes[index]}
                  </text>
                </hstack>
                <text color={colors.text} size="xsmall">
                  mine
                </text>
                <text color={colors.text} size="xsmall">
                  reports
                </text>
              </vstack>
            </zstack>
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
    
    // Render the game status
    const renderStatus = () => {
      if (gameOver) {
        return <text alignment="center" color={colors.text} weight="bold">Game Over! You hit a mine.</text>;
      } else if (gameWon) {
        return <text alignment="center" color={colors.text} weight="bold">You Win! All safe tiles revealed.</text>;
      } else {
        return <text alignment="center" color={colors.text} weight="bold">Score: {score}</text>;
      }
    };
  
    // For non-logged in users, show a message
    if (!userGameStateKey) {
      return (
        <vstack height="100%" width="100%" gap="medium" alignment="center middle" backgroundColor={colors.background}>
          <text color={colors.text}>Please log in to play and save your game progress.</text>
        </vstack>
      );
    }
  
    return (
      <vstack height="100%" width="100%" gap="medium" alignment="center middle" backgroundColor={colors.background}>
        <vstack gap="large">
          {renderStatus()}
          <vstack height="80%" width="100%" gap="medium">
            {renderGrid()}
          </vstack>
          <hstack gap="medium">
            {(gameOver || gameWon) && 
              <button 
                onPress={promptDevilOrAngel}
                appearance="primary"
                textColor={colors.buttonText}
              >
                Play Again
              </button>
            }
            <button 
              onPress={toggleTheme}
              appearance="primary"
              textColor={colors.buttonText}
            >
              Switch to {theme === "dark" ? "Light" : "Dark"} Theme
            </button>
          </hstack>
        </vstack>
      </vstack>
    );
  }
});

export default Devvit;