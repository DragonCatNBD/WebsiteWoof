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

// 1. Serve Public Files (HTML, CSS, Images, Music) normally
// These are accessible to everyone
webApp.use(express.static(path.join(__dirname, 'public')));

// 2. PROTECTED DOWNLOAD ROUTE
// This route checks the key before sending the file
webApp.get('/download/:filename', async (req, res) => {
    const filename = req.params.filename;
    const userKey = req.query.key; // Key is passed in URL like ?key=XXXX

    console.log(`Download request for ${filename} with key ${userKey}`);

    if (!userKey) {
        return res.status(403).send("Access Denied: No Key Provided");
    }

    try {
        // Check if key is valid in Firebase
        const snapshot = await db.ref('access_keys/' + userKey).once('value');
        
        if (snapshot.exists()) {
            // Key is valid! Send the file from the 'secure_downloads' folder
            const filePath = path.join(__dirname, 'secure_downloads', filename);
            return res.download(filePath, (err) => {
                if (err) {
                    console.error("File download error:", err);
                    res.status(404).send("File not found.");
                }
            });
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

// --- DISCORD BOT (Same as before) ---
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
