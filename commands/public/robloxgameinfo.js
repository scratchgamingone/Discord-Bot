import fetch from 'node-fetch';
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export default {
    data: new SlashCommandBuilder()
        .setName('robloxinfo')
        .setDescription('Get information about a Roblox game')
        .addStringOption(option =>
            option.setName('gameid')
                .setDescription('The Roblox game ID (optional)')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply();

        let gameId = interaction.options.getString('gameid');
        
        if (gameId && !isValidGameId(gameId)) {
            return interaction.editReply('Invalid game ID. Please provide a valid Roblox game ID (a number with 5 or more digits).');
        }

        gameId = gameId || await getRandomGameId();

        try {
            const universeId = await getUniverseId(gameId);
            const gameInfo = await fetchGameInfoWithRetry(universeId);
            const embed = createGameEmbed(gameInfo, gameId);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching Roblox game info:', error);
            if (error.message === 'Game not found') {
                await interaction.editReply(`Sorry, I couldn't find a game with ID ${gameId}. Please try a different game ID.`);
            } else {
                await interaction.editReply('Sorry, there was an issue fetching the Roblox game information. Please try again later.');
            }
        }
    },
};

function isValidGameId(id) {
    return /^\d{5,}$/.test(id);
}

async function getRandomGameId() {
    // This is still a placeholder. In a real scenario, you'd want to have a list of known valid game IDs.
    return Math.floor(Math.random() * 1000000 + 100000).toString();
}

async function getUniverseId(gameId) {
    const response = await fetch(`https://apis.roblox.com/universes/v1/places/${gameId}/universe`);
    if (!response.ok) {
        throw new Error('Game not found');
    }
    const data = await response.json();
    return data.universeId;
}

async function fetchGameInfoWithRetry(universeId, retries = 0) {
    try {
        const response = await fetch(`https://games.roblox.com/v1/games?universeIds=${universeId}`);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data.data && data.data.length > 0) {
            return data.data[0];
        } else {
            throw new Error('Game not found');
        }
    } catch (error) {
        if (retries < MAX_RETRIES) {
            console.log(`Retry attempt ${retries + 1} for universe ID ${universeId}`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            return fetchGameInfoWithRetry(universeId, retries + 1);
        } else {
            throw error;
        }
    }
}

function createGameEmbed(gameInfo, gameId) {
    return new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle(gameInfo.name)
        .setURL(`https://www.roblox.com/games/${gameId}`)
        .setDescription(gameInfo.description || 'No description available')
        .addFields(
            { name: 'Creator', value: gameInfo.creator.name, inline: true },
            { name: 'Playing', value: gameInfo.playing.toString(), inline: true },
            { name: 'Visits', value: gameInfo.visits.toString(), inline: true },
            { name: 'Created', value: new Date(gameInfo.created).toDateString(), inline: true },
            { name: 'Updated', value: new Date(gameInfo.updated).toDateString(), inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Powered by Roblox API' });
}