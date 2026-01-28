require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const admin = require('firebase-admin');
const express = require('express');
const path = require('path');

// --- FIREBASE SETUP ---
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://keywebsite1-default-rtdb.europe-west1.firebasedatabase.app"
});
const db = admin.database();

// --- WEB SERVER SETUP (Express) ---
const webApp = express();
const PORT = process.env.PORT || 3000;

// Serve the 'public' folder
webApp.use(express.static(path.join(__dirname, 'public')));

// Start the web server
webApp.listen(PORT, () => {
    console.log(`Website running on port ${PORT}`);
});

// --- DISCORD BOT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel] 
});

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
    try {
        // Generate Random Key
        const generateKey = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let key = '';
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 4; j++) key += chars.charAt(Math.floor(Math.random() * chars.length));
                if (i < 2) key += '-';
            }
            return key;
        };

        const newKey = generateKey();

        // Save to Firebase
        await db.ref('access_keys').update({
            [newKey]: true
        });

        // DM User
        await member.send({
            content: `🔓 **ACCESS GRANTED**\n\nHere is your unique key:\n\`${newKey}\`\n\nUse this on the website.`
        });

        console.log(`Key generated for ${member.user.tag}: ${newKey}`);

    } catch (error) {
        console.error("Error:", error);
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);
