import { Devvit, useState, useWebView } from '@devvit/public-api';

export const ResultsPage: Devvit.BlockComponent = ({
    angelCount,
    angelScore,
    devilCount,
    devilScore,
    userFaction,
    tileVotes, 
    minePosition,   
}, { postId, redis, reddit }) => {
    
    const renderGrid = () => {
        const size=3;
        const rows = [];
        for (let i = 0; i < size; i++) {
          const tiles = [];
          
          for (let j = 0; j < size; j++) {
            const index = i * size + j;
            
            
            tiles.push(
              <zstack 
                key={`tile-${index}`}
                width="50px" 
                height="50px"
                alignment="center middle"
                cornerRadius='small'
              >
                {/* Colored overlay */}
                <hstack 
                  width="100%" 
                  height="100%" 
                  alignment="center middle"
                  backgroundColor='grey'
                />
                
                {/* Content */}
                <vstack alignment="center" cornerRadius='small'>
                  {/* Always show vote count */}
                  <hstack alignment="center middle" gap="small">
                    <text color={colors.text} weight="bold" size="xlarge">
                      {tileVotes[index]}
                    </text>
                    {index!=minePosition &&(
                      <image 
                        url="redflag.png"
                        imageWidth={20} 
                        imageHeight={20} 
                        resizeMode="cover"
                      />
                    )}

                    {index===minePosition && (
                    <image 
                      url="bomb.png"
                      imageWidth={20} 
                      imageHeight={20} 
                      resizeMode="cover"
                    />
                  )}
                  </hstack>
                </vstack>

              </zstack>
            );
          }
          
          rows.push(
            <hstack key={`row-${i}`} gap='small'>
              {tiles}
            </hstack>
          );
        }
        
        return rows;
      };
    // Determine the leading team
    const isAngelLead = angelScore! > devilScore!;

    const isDraw = angelScore === devilScore;
    
    // Dark theme color scheme
    const colors = {
        angels: {
            background: "#1E2A3A",
            text: "#4AB3FF",
            highlight: "#87CEEB",
            border: "#4AB3FF"
        },
        devils: {
            background: "#2A1E1E",
            text: "#FF6347",
            highlight: "#FF4500",
            border: "#FF6347"
        },
        background: "#121212",
        text: "#E0E0E0"
    };

        const { mount } = useWebView({
          url: 'scoring.html',
          onMessage: (message) => {
            console.log(`Received message: ${message}`);
          }
        });

    
    // Determine personalized message based on user's faction and game outcome
    const userTeamIndicator = () => {

        if (userFaction === 'angel') {
            return "Your team: Angels 👼";
        }

        if (userFaction === 'devil') {
            return "Your team: Devils 😈";
        } 

        return "";
    };

    return (
        <zstack height="100%" width="100%">
            {/* Background */}
            <hstack 
                height="100%" 
                width="100%" 
                backgroundColor={colors.background}
                alignment="center middle"
            >
                <vstack 
                    height="90%" 
                    width="90%" 
                    backgroundColor="#1E1E1E" 
                    cornerRadius="large" 
                    alignment="center middle"
                    gap="small"
                    padding="large"
                >
                    {/* Title */}
                    <vstack alignment="center middle" gap="small">
                        <text 
                            color={isDraw ? colors.text : (isAngelLead ? colors.angels.text : colors.devils.text)}
                            size="xxlarge" 
                            weight="bold"
                        >
                            {isDraw 
                                ? "It's a Tie! 🤝" 
                                : (isAngelLead 
                                    ? "Angels are winning! 👼" 
                                    : "Devils are winning! 😈"
                                )
                            }
                        </text>
                        <text 
                            color="#888" 
                            size="small"
                        >
                        </text>
                    </vstack>

                    {/* Scores Breakdown */}
                    <hstack 
                        width="100%" 
                        height="150px" 
                        gap="medium" 
                        alignment="center middle"
                    >
                        {/* Angels Side */}
                        <vstack 
                            width="45%" 
                            height="100%" 
                            backgroundColor={colors.angels.background}
                            borderColor={colors.angels.border}
                            border="thick"
                            cornerRadius="medium"
                            alignment="center middle"
                            gap="medium"
                            padding="medium"
                           
                        >
                            {/* Trophy for Angels if they're winning */}
                            {isAngelLead && !isDraw && (
                                <hstack 

                                >
                                    <text 
                                        color={colors.angels.text} 
                                        size="xlarge"
                                    >
                                        🏆
                                    </text>
                                </hstack>
                            )}
                            <text 
                                color={colors.angels.text} 
                                size="large" 
                                weight="bold"
                            >
                                Angels 👼
                            </text>
                            <vstack alignment="center middle" gap="small">
                                <text 
                                    color={colors.angels.text} 
                                    size="xxlarge" 
                                    weight="bold"
                                >
                                    {`${angelScore}`} pts
                                </text>
                                <text 
                                    color={colors.angels.text} 
                                    size="small"
                                >
                                    {`${angelCount}`} Players
                                </text>
                            </vstack>
                        </vstack>

                        {/* Devils Side */}
                        <vstack 
                            width="45%" 
                            height="100%" 
                            backgroundColor={colors.devils.background}
                            borderColor={colors.devils.border}
                            border="thick"
                            cornerRadius="medium"
                            alignment="center middle"
                            gap="medium"
                            padding="medium"
                            
                        >
                            {/* Trophy for Devils if they're winning */}
                            {!isAngelLead && !isDraw && (
                                <hstack 

                                >
                                    <text 
                                        color={colors.devils.text} 
                                        size="xxlarge"
                                    >
                                        🏆
                                    </text>
                                </hstack>
                            )}
                            <text 
                                color={colors.devils.text} 
                                size="large" 
                                weight="bold"
                            >
                                Devils 😈
                            </text>
                            <vstack alignment="center middle" gap="small">
                                <text 
                                    color={colors.devils.text} 
                                    size="xxlarge" 
                                    weight="bold"
                                >
                                    {`${devilScore}`} pts
                                </text>
                                <text 
                                    color={colors.devils.text} 
                                    size="small"
                                >
                                    {`${devilCount}`} Players
                                </text>
                            </vstack>
                        </vstack>
                    </hstack>

                    {/* Summary */}
                    <vstack 
                        width="100%" 
                        alignment="center middle" 
                        gap="small"
                    >
                        {renderGrid()}
                        <text 
                            color={colors.text}
                            size="medium" 
                            weight="bold"
                            alignment="center"
                        >
                            {userTeamIndicator()}
                        </text>
                    </vstack>

                    <hstack 
                        height="10%" 
                        width="100%" 
                        gap="small" 
                        alignment="center middle"
                    >
                        <text 
                            color={colors.text}
                            size="xsmall"  // Made text smaller
                            weight="regular"  // Lighter font weight
                        >
                            Scoring System
                        </text>
                        <button 
                            onPress={()=>{
                                console.log('mounting');
                                mount();
                            }}
                            appearance="plain"
                            textColor="white"
                            size='small'  // Reduced button size
                            grow={false}
                            width={5}
                            maxWidth={5}
                            icon='help'
                        />
                    </hstack>
                </vstack>
            </hstack>
        </zstack>
    );
};



export default ResultsPage;