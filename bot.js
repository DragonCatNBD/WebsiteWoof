require('dotenv').config();
const { Client, GatewayIntentBits, Partials } = require('discord.js');
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// --- FIREBASE SETUP ---
// We use the database URL from your provided config
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://keywebsite1-default-rtdb.europe-west1.firebasedatabase.app"
});

const db = admin.database();

// --- DISCORD BOT SETUP ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel] // Needed to DM users
});

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
    try {
        // 1. Generate Random Key
        const generateKey = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            let key = '';
            for (let i = 0; i < 3; i++) {
                for (let j = 0; j < 4; j++) {
                    key += chars.charAt(Math.floor(Math.random() * chars.length));
                }
                if (i < 2) key += '-';
            }
            return key;
        };

        const newKey = generateKey();

        // 2. Save to Firebase
        await db.ref('access_keys').update({
            [newKey]: true
        });

        // 3. DM User
        await member.send({
            content: `🔓 **ACCESS GRANTED**\n\nHere is your unique key:\n\`${newKey}\`\n\nUse this on the website.`
        });

        console.log(`Key generated for ${member.user.tag}: ${newKey}`);

    } catch (error) {
        console.error("Error sending DM:", error);
    }
});

client.login(process.env.DISCORD_BOT_TOKEN);