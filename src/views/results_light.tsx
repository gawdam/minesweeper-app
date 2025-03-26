import { Devvit, useState } from '@devvit/public-api';

export const ResultsPage: Devvit.BlockComponent = ({
    angelCount,
    angelScore,
    devilCount,
    devilScore,
    winner,
}, { postId, redis }) => {
    // Determine the leading team
    const isAngelLead = angelScore! > devilScore!;
    const isDraw = angelScore === devilScore;
    
    // Color scheme
    const colors = {
        angels: {
            background: "#E6F3FF",
            text: "#0A5587",
            highlight: "#4AB3FF",
            border: "#87CEEB"
        },
        devils: {
            background: "#FFE6E6",
            text: "#8B0000",
            highlight: "#FF6347",
            border: "#FF4500"
        }
    };

    return (
        <zstack height="100%" width="100%">
            <hstack 
                height="100%" 
                width="100%" 
                backgroundColor="#F0F0F0"
                alignment="center middle"
            >
                <vstack 
                    height="90%" 
                    width="90%" 
                    backgroundColor="white" 
                    cornerRadius="large" 
                    alignment="center middle"
                    gap="large"
                    padding="large"
                >                    
                <vstack alignment="center middle" gap="small">
                        <text 
                            color={isDraw ? "#666" : (isAngelLead ? colors.angels.text : colors.devils.text)}
                            size="xxlarge" 
                            weight="bold"
                        >
                            {isDraw 
                                ? "It's a Celestial Tie! 🤝" 
                                : (isAngelLead 
                                    ? "Angels Ascending! 👼" 
                                    : "Devils Dominate! 😈"
                                )
                            }
                        </text>
                        <text 
                            color="#666" 
                            size="small"
                        >
                            Final Battleground Results
                        </text>
                    </vstack>
                    <hstack 
                        width="100%" 
                        height="200px" 
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
                                    size="xlarge" 
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
                                    size="xlarge" 
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
                    <vstack 
                        width="100%" 
                        alignment="center middle" 
                        gap="small"
                    >
                        <text 
                            color="#333" 
                            size="medium" 
                            weight="bold"
                            alignment="center"
                        >
                            {isDraw 
                                ? "A perfect balance between light and darkness!" 
                                : (isAngelLead 
                                    ? "The celestial realm triumphs!" 
                                    : "The infernal forces reign supreme!"
                                )
                            }
                        </text>
                    </vstack>
                </vstack>
            </hstack>
        </zstack>
    );
};

export default ResultsPage;