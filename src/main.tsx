// Learn more at developers.reddit.com/docs
import { Devvit, useState, useForm, useWebView} from '@devvit/public-api';
import { createForm } from './forms/menuForm.js';
import { ResultsPage } from './views/results.js';

Devvit.configure({
  redditAPI: true,
  realtime: true,
  redis: true,
});

// Game state interface for type safety
type GameState = {
  size: number;
  minePosition: number;
  tileStates: (boolean)[];
  tileVotes: number[];
  userFaction: string;
  gameOver: boolean;
  gameWon: boolean;
  theme: string; // Add theme to game state
  hasVoted: boolean;
  angelScore: number;
  angelCount:number;
  devilScore: number;
  devilCount:number;
}

// Add a menu item to the subreddit menu for instantiating the new experience post
Devvit.addMenuItem({
  label: 'Create a new mine field!',
  location: 'subreddit',
  onPress: (_event, context) => {
    context.ui.showForm(createForm);
  },
});

// Devvit.addCustomPostType({
//   name: 'Game with Leaderboard',
//   render: ({redis}) => {
//     // Simple routing
//     if (path === '/leaderboard') {
//       return <LeaderboardScreen />;
//     } else {
//       return <GameScreen context={context} />;
//     }
//   },
// });

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Experience Post',
  height: 'tall',
  
  render: ({redis, postId, userId, ui, assets}) => {


    const { mount } = useWebView({
      url: 'howToPlay.html',
      onMessage: (message) => {
        console.log(`Received message: ${message}`);
      }
    });

    


    // Get a unique key for this user's game state
    const userGameStateKey = userId ? `${postId}_game_${userId}` : null;
    const GameVotesKey =  `${postId}_votes`;
    
    // Use useState with an async initializer to fetch the grid size and game state
    const [gameData] = useState<GameState>(async () => {
      const formGridSize = await redis.get(`u${postId}_gridSize`);
      const minePosition = await redis.get(`${postId}_minePosition`).then((value) => parseInt(value!));

      const size = formGridSize ? parseInt(formGridSize) : 3;
      const voteCounts = await redis.get(GameVotesKey).then((value) => value ? JSON.parse(value) : Array(size * size).fill(0));
      const angelScore = await redis.get(`score_${postId}_angel`).then((value) => value ? parseInt(value) : 0);
      const angelCount = await redis.get(`count_${postId}_angel`).then((value) => value ? parseInt(value) : 0);
      const devilScore = await redis.get(`score_${postId}_devil`).then((value) => value ? parseInt(value) : 0);
      const devilCount = await redis.get(`count_${postId}_devil`).then((value) => value ? parseInt(value) : 0);

      console.log(`Loaded gridSize: ${size}`);
      console.log(assets.getURL("explosion.png"));

      
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
        tileVotes: voteCounts ? voteCounts : Array(size * size).fill(0),
        userFaction: '-',
        gameOver: false,
        gameWon: false,
        theme: "dark", // Default theme
        hasVoted: false,
        angelScore:angelScore,
        angelCount:angelCount,
        devilScore:devilScore,
        devilCount:devilCount,
      };
    });
    
    // Create states from game data
    const [tileStates, setTileStates] = useState(gameData ? gameData.tileStates : []);
    const [tileVotes, setTileVotes] = useState(gameData ? gameData.tileVotes : [])
    const [userFaction, setUserFaction] = useState(gameData ? gameData.userFaction : '-');
    const [gameOver, setGameOver] = useState(false);
    const [gameWon, setGameWon] = useState(false);
    const [theme, setTheme] = useState(gameData ? gameData.theme : "dark");
    const [voteIndex, setVoteIndex] = useState(-1);
    const [hasVoted, setHasVoted] = useState(gameData.hasVoted);

    // Modify the useState initializer to always save initial scores
    const [angelScore, setAngelScore] = useState(async () => {
      const score = await redis.get(`score_${postId}_angel`);
      const parsedScore = score ? parseInt(score) : 0;
      // Save the initial score if it doesn't exist
      if (!score) {
        await redis.set(`score_${postId}_angel`, `${parsedScore}`);
      }
      return parsedScore;
    });
    
    // Similar modification for other score variables
    const [angelCount, setAngelCount] = useState(async () => {
      const count = await redis.get(`count_${postId}_angel`);
      const parsedCount = count ? parseInt(count) : 0;
      if (!count) {
        await redis.set(`count_${postId}_angel`, `${parsedCount}`);
      }
      return parsedCount;
    });
    
    // In your state update functions, always save to Redis
    const updateAngelScore = async (newScore: number) => {
      setAngelScore(newScore);
      await redis.set(`score_${postId}_angel`, `${newScore}`);
    };
    
    const updateAngelCount = async (newCount: number) => {
      setAngelCount(newCount);
      await redis.set(`count_${postId}_angel`, `${newCount}`);
    };
    const [devilScore, setDevilScore] = useState(async () => {
      const score = await redis.get(`score_${postId}_devil`);
      const parsedScore = score ? parseInt(score) : 0;
      // Save the initial score if it doesn't exist
      if (!score) {
        await redis.set(`score_${postId}_devil`, `${parsedScore}`);
      }
      return parsedScore;
    });
    const [devilCount, setDevilCount] = useState(async () => {
      const count = await redis.get(`count_${postId}_devil`);
      const parsedCount = count ? parseInt(count) : 0;
      if (!count) {
        await redis.set(`count_${postId}_devil`, `${parsedCount}`);
      }
      return parsedCount;
    });

    const updateDevilScore = async (newScore: number) => {
      setDevilScore(newScore);
      await redis.set(`score_${postId}_devil`, `${newScore}`);
    };
    
    const updateDevilCount = async (newCount: number) => {
      setDevilCount(newCount);
      await redis.set(`count_${postId}_devil`, `${newCount}`);
    };

    console.log("hasVoted1", hasVoted);

    console.log("Scores", {angelCount, angelScore, devilCount, devilScore, userFaction});

    if(hasVoted){
     return <ResultsPage 
     angelCount={angelCount}
     angelScore={angelScore}
     devilCount={devilCount}
     devilScore={devilScore}
     userFaction={userFaction}
   />; 
    }
    // Theme colors
    const themeColors = {
      dark: {
        background: "#0F1020", // Deep, rich midnight blue
        tile: {
          untouched: "#5C5C5C", // Deep slate blue for untouched tiles
          safe: "#2ECC71", // Bright, vibrant emerald green - signifying safety and life
          mine: "#E74C3C" // Bright, alarming red - indicating clear danger
        },
        text: "#FAF9F6", // Soft, slightly off-white for better readability
        border: "#2C3E50", // Muted dark blue-gray for borders
        button: "#2C3E50", // Sophisticated dark blue-gray for buttons
        buttonText: "#E0E6ED", // Matching soft text color
        iconColor: "#FF6B6B" // Softer, more vibrant coral-red
      },
  
      light: {
        background: "#FFFFFF",
        tile: {
          untouched: "#E0E0E0",
          safe: "#A5D6A7", // Light green
          mine: "#FFCDD2"  // Light red
        },
        text: "#121212",
        border: "#000000",
        button: "#F5F5F5",
        buttonText: "#121212",
        iconColor: "#FF4500" // Reddit's orangered color
      }
    };
    
    // Get current theme colors
    const colors = theme === "dark" ? themeColors.dark : themeColors.light;
    
    // Function to save game state to Redis
    const saveGameState = async (updatedTileStates: boolean[], updatedTileVotes: number[], updatedFaction: string, isGameOver: boolean, isGameWon: boolean, hasVoted:boolean, angelCount:number,angelScore:number,devilCount:number,devilScore:number) => {
      if (!gameData || !userGameStateKey) return;
      
      const stateToSave: GameState = {
        ...gameData,
        tileStates: updatedTileStates,
        tileVotes: updatedTileVotes,
        userFaction: updatedFaction,
        gameOver: isGameOver,
        gameWon: isGameWon,
        theme: theme,
        hasVoted: hasVoted,
        angelScore: angelScore,
        angelCount: angelCount,
        devilScore: devilScore,
        devilCount: devilCount,

      };
      
      redis.set(userGameStateKey, JSON.stringify(stateToSave));
      console.log("Game state saved");
    };
    
    const refreshTileVotes = async () => {
      // First try to use gameData if available
      if (gameData && gameData.tileVotes) {
        return gameData.tileVotes;
      }
      // Otherwise fetch from Redis
      const countString = await redis.get(GameVotesKey);
      console.log(`Loaded votes: ${countString}`);
      const voteCounts = countString ? JSON.parse(countString) : []
      setTileVotes(voteCounts);
      return voteCounts;
    };
    
    // Function to handle tile press
    const handleTilePress = async (index: number) => {
      if (!gameData) {
        return; // Ignore if game is over or tile already revealed
      }
      if (gameOver || gameWon) {
        setVoteIndex(index);
      }
      
      // Check if clicked on mine
      else if (index === gameData.minePosition) {
        // Create new state arrays to pass to saveGameState
        const newTileStates = [...tileStates];
        newTileStates[index] = false; // false = mine
        
        setTileStates(newTileStates);

          setGameOver(true);

        
        // Save updated state with the new arrays
        saveGameState(newTileStates, tileVotes, '-', true, false,false,angelCount,angelScore,devilCount,devilScore);  
      } else {
        // Safe tile
        const newTileStates = [...tileStates];

        newTileStates[index] = true; // true = safe
        

        
        setTileStates(newTileStates);
        
        // Check if all safe tiles are revealed (win condition)
        const safeTilesCount = gameData.size * gameData.size - 1; // All tiles except the mine
        const revealedSafeTiles = newTileStates.filter(state => state === true).length; // Count revealed safe tiles
        
        const isWon = revealedSafeTiles >= safeTilesCount;
        if (isWon) {
            setGameWon(true);
        }
        
        // Save updated state with the new arrays
        // saveGameState(newTileStates, newTileVotes, newScore, false, isWon);
      }
    };
        
    // If gameData is not yet loaded, show loading state
    if (!gameData) {
      return <vstack alignment="center middle" height="100%" width="100%" backgroundColor={colors.background}>
        <text color={colors.text}>Loading...</text>
      </vstack>;
    }
    


const saveAndShowLeaderboard = async () => {
  tileVotes[voteIndex] += 1;

  if(voteIndex === gameData.minePosition){
    const newAngelScore = angelScore + (gameWon ? 5 : 0);
    const newDevilScore = devilScore + (gameWon ? 0 : 2);
    const newAngelCount = angelCount + 1;

    await updateAngelScore(newAngelScore);
    await updateAngelCount(newAngelCount);
    await updateDevilScore(newDevilScore);
    
    setUserFaction('angel');
  } else {
    const newDevilScore = devilScore + (gameWon ? 5 : 2);
    const newDevilCount = devilCount + 1;

    await updateDevilScore(newDevilScore);
    await updateDevilCount(newDevilCount);
    
    setUserFaction('devil');
  }

  saveGameState(tileStates, tileVotes, userFaction, gameOver, gameWon, true, angelCount, angelScore, devilCount, devilScore);
  await redis.set(GameVotesKey, JSON.stringify(tileVotes));
  setHasVoted(true);
};
    
    // Create the grid
    const renderGrid = () => {
      refreshTileVotes();
      const rows = [];
      const size = gameData.size;
      
      for (let i = 0; i < size; i++) {
        const tiles = [];
        
        for (let j = 0; j < size; j++) {
          const index = i * size + j;
          
          // Always use untouched color if game is over
          const tileColor = (gameOver || gameWon) 
            ? colors.tile.untouched 
            : (
                tileStates[index] === true 
                  ? colors.tile.safe 
                  : (tileStates[index] === false 
                      ? colors.tile.mine 
                      : colors.tile.untouched)
              );
          
          tiles.push(
            <zstack 
              key={`tile-${index}`}
              width="60px" 
              height="60px"
              borderColor={colors.border}
              onPress={async () => await handleTilePress(index)}
              alignment="center middle"
              cornerRadius='small'
            >
              {/* Colored overlay */}
              <hstack 
                width="100%" 
                height="100%" 
                backgroundColor={tileColor} 
                alignment="center middle"
              />
              
              {/* Content */}
              <vstack alignment="center" cornerRadius='small'>
                {/* Always show vote count */}
                <hstack alignment="center middle" gap="small">
                  <text color={colors.text} weight="bold" size="xlarge">
                    {voteIndex === index ? tileVotes[index] + 1 : tileVotes[index]}
                  </text>
                  
                  {/* Red flag only on the specific tile that was pressed during game over */}
                  {(!gameOver && !gameWon) && (
                    <image 
                      url="redflag.png"
                      imageWidth={20} 
                      imageHeight={20} 
                      resizeMode="cover"
                    />
                  )}
                  {(gameOver||gameWon) && index===gameData.minePosition && (
                    <image 
                      url="bomb.png"
                      imageWidth={20} 
                      imageHeight={20} 
                      resizeMode="cover"
                    />
                  )}
                </hstack>
              </vstack>
              {voteIndex==index && (
                    <image 
                      url="redflag.png"
                      imageWidth={20} 
                      imageHeight={20} 
                      resizeMode="cover"
                    />
                  )}
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

        return (
          <hstack alignment="center middle" width="100%" height="12%" backgroundColor={gameWon?"darkgreen":'#303030'} cornerRadius='small' gap='none' borderColor='transparent' >

          <vstack height="90%" width="80%" cornerRadius='none' gap='none' >
            <spacer></spacer>
              <text color={colors.text} weight="bold" size='large' alignment='center middle' grow={false}>
                {gameOver ? "You lost 😔" : (gameWon ? "You Won🏆!" : "Avoid the mine!")}
              </text>
            
            <text color={colors.text} weight="bold" size='xsmall' alignment='center middle' grow={false} >
              {
              (!gameOver && !gameWon) ?
              "Each cell shows #mine reports"
              :
              voteIndex === gameData.minePosition 
                ? "Join the angels 👼\n"
                : (voteIndex === -1 
                  ? "Place your mine flag!"
                  : "Join the devils 😈 \n"
                )
              }
            </text>
          </vstack>
          <button 
          onPress={()=>{
            console.log('mounting');
            mount();
          }}
          appearance="plain"
          textColor={colors.buttonText}
          size='medium'
          grow={false}
          width={10}
          maxWidth={10}
          icon='help'
        >
            
        </button>
        </hstack>

        );
      
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
      <zstack height="100%" width="100%">
        {/* Background image */}
        <image
          url="tile_background.png"
          imageWidth={1200}  // Set this to your image's actual width
          imageHeight={800}  // Set this to your image's actual height
          width="100%"
          height="100%"
          resizeMode="cover"
          
        />
        
        {/* Content layer */}
        <vstack height="100%" width="100%" gap="medium" alignment="center middle" >
          <vstack gap="large" backgroundColor='transparent' cornerRadius='small' height="100%" >
            <hstack gap="small" width="100%" height="2%"></hstack>
            {renderStatus()}
            <vstack height="60%" width="100%" gap="small" alignment='center middle' backgroundColor='transparent'>
              {renderGrid()}
            </vstack>
            {(gameOver || gameWon) && (
                <button 
                appearance="primary"
                textColor="white"
                onPress={saveAndShowLeaderboard}>
                Confirm
              </button>
                  )}
              
          </vstack>
        </vstack>
      </zstack>
    );
  }
});

export default Devvit;