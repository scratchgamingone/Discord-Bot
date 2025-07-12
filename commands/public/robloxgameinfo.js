import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import fetch from 'node-fetch';

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

        const gameId = interaction.options.getString('gameid') || await getRandomGameId();

        try {
            const gameInfo = await fetchGameInfo(gameId);
            const embed = createGameEmbed(gameInfo);
            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error fetching Roblox game info:', error);
            await interaction.editReply('Sorry, I couldn\'t fetch the Roblox game information. Please try again later.');
        }
    },
};

async function getRandomGameId() {
    // This is a simplified way to get a random game ID. In reality, you might want to fetch popular games and select one.
    return Math.floor(Math.random() * 1000000000).toString();
}

async function fetchGameInfo(gameId) {
    // First, we need to get the universe ID from the place ID
    const placeResponse = await fetch(`https://apis.roblox.com/universes/v1/places/${gameId}/universe`);
    const placeData = await placeResponse.json();
    
    if (!placeData.universeId) {
        throw new Error('Game not found');
    }

    // Now we can fetch the game details using the universe ID
    const gameResponse = await fetch(`https://games.roblox.com/v1/games?universeIds=${placeData.universeId}`);
    const gameData = await gameResponse.json();

    if (!gameData.data || gameData.data.length === 0) {
        throw new Error('Game details not found');
    }

    const game = gameData.data[0];

    // Fetch additional place details
    const placeDetailsResponse = await fetch(`https://games.roblox.com/v1/games/multiget-place-details?placeIds=${gameId}`);
    const placeDetailsData = await placeDetailsResponse.json();

    if (placeDetailsData && placeDetailsData.length > 0) {
        return { ...game, ...placeDetailsData[0] };
    }

    return game;
}
function createGameEmbed(game) {
    return new EmbedBuilder()
        .setColor('#00A2FF')
        .setTitle(game.name)
        .setURL(`https://www.roblox.com/games/${game.rootPlaceId}/`)
        .setDescription(game.description || 'No description available.')
        .addFields(
            { name: 'Creator', value: game.creator?.name || 'Unknown', inline: true },
            { name: 'Playing', value: game.playing?.toString() || '0', inline: true },
            { name: 'Visits', value: game.visits?.toString() || '0', inline: true },
            { name: 'Created', value: game.created ? new Date(game.created).toDateString() : 'Unknown', inline: true },
            { name: 'Updated', value: game.updated ? new Date(game.updated).toDateString() : 'Unknown', inline: true },
            { name: 'Max Players', value: game.maxPlayers?.toString() || 'Unknown', inline: true },
            { name: 'Genre', value: game.genre || 'Not specified', inline: true },
            { name: 'Price', value: game.price === 0 ? 'Free' : `${game.price} Robux`, inline: true },
            { name: 'Copying Allowed', value: game.copyingAllowed ? 'Yes' : 'No', inline: true },
            { name: 'Game Rating', value: game.gameRating?.name || 'Not rated', inline: true }
        )
        .setTimestamp()
        .setFooter({ text: 'Powered by Roblox API' });
}