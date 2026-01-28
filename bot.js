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

// --- EXPRESS SETUP ---
const webApp = express();
const PORT = process.env.PORT || 3000;

// 1. Serve Public Files normally
webApp.use(express.static(path.join(__dirname, 'public')));

// 2. SECURE DOWNLOAD REDIRECT ROUTE
// This maps the fake filename to the REAL Google Drive / Mega link
const fileLinks = {
    // KEY = the filename you type in index.html
    // VALUE = the actual URL where the file is hosted
    "Xyph Hub.zip": "https://drive.google.com/file/d/1ZXHHeJiTSZdzmOpckVX_3Dz6xHvYbvIy/view?usp=sharing",
    "RFTAS.zip": "https://drive.google.com/file/d/1VLg_rSYcVUOXya8AndDNmjBKbipmP97y/view?usp=sharing",
};

webApp.get('/download/:filename', async (req, res) => {
    const filename = req.params.filename;
    const userKey = req.query.key;

    console.log(`Download request for ${filename} with key ${userKey}`);

    if (!userKey) return res.status(403).send("Access Denied: No Key Provided");

    try {
        // Check if key is valid in Firebase
        const snapshot = await db.ref('access_keys/' + userKey).once('value');
        
        if (snapshot.exists()) {
            // Key is valid! Look up the real link
            const realUrl = fileLinks[filename];

            if (realUrl) {
                console.log(`Redirecting to: ${realUrl}`);
                return res.redirect(realUrl);
            } else {
                res.status(404).send("File not found on server.");
            }
        } else {
            res.status(403).send("Access Denied: Invalid Key");
        }
    } catch (error) {
        console.error(error);
        res.status(500).send("Server Error");
    }
});

webApp.listen(PORT, () => {
    console.log(`System running on port ${PORT}`);
});

// --- DISCORD BOT (Unchanged) ---
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
    partials: [Partials.Channel] 
});

client.once('ready', () => {
    console.log(`Bot logged in as ${client.user.tag}`);
});

client.on('guildMemberAdd', async (member) => {
    try {
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
        await db.ref('access_keys').update({ [newKey]: true });
        await member.send({
            content: `🔓 **ACCESS GRANTED**\n\nKey: \`${newKey}\`\n\nUse this on the website.`
        });
        console.log(`Key generated for ${member.user.tag}`);
    } catch (error) { console.error("Error:", error); }
});

client.login(process.env.DISCORD_BOT_TOKEN);
