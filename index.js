require('dotenv').config();
const express = require('express');
const { Client } = require("discord.js-selfbot-v13");
const path = require('path');
const fs = require('fs');
const crypto = require('crypto-js');

const app = express();
app.set('view engine', 'ejs');
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public')); // تقديم الملفات الثابتة

let client;
let intervalId;

const SECRET_KEY = 'your_secret_key'; // استخدم مفتاحًا سريًا قويًا هنا

const encrypt = (text) => {
    return crypto.AES.encrypt(text, SECRET_KEY).toString();
};

const decrypt = (ciphertext) => {
    const bytes = crypto.AES.decrypt(ciphertext, SECRET_KEY);
    return bytes.toString(crypto.enc.Utf8);
};

app.get('/', (req, res) => {
    const isRunning = client && client.user;
    const botName = isRunning ? client.user.username : null;
    res.render('index', { isRunning, botName });
});

app.post('/config', (req, res) => {
    const { token, serverId, roomId, message, interval } = req.body;

    // تشفير البيانات وتخزينها في ملف
    const encryptedData = {
        token: encrypt(token),
        serverId: encrypt(serverId),
        roomId: encrypt(roomId),
        message: encrypt(message),
        interval: encrypt(interval.toString())
    };

    fs.writeFileSync('config.json', JSON.stringify(encryptedData));

    startBot(token, roomId, message, interval);

    res.send('Bot is configured and running');
});

app.post('/stop', (req, res) => {
    stopBot();
    res.send('Bot has been stopped');
});

const startBot = (token, roomId, message, interval) => {
    if (client) {
        clearInterval(intervalId);
        client.destroy();
    }

    client = new Client({ disableEveryone: true });

    client.on('ready', async () => {
        console.log(`Logged in as ${client.user.username}!`);

        intervalId = setInterval(() => {
            const channel = client.channels.cache.get(roomId);
            if (channel) {
                channel.send(message);
            } else {
                console.error(`Channel with ID ${roomId} not found`);
            }
        }, interval);
    });

    client.login(token);
};

const stopBot = () => {
    if (client) {
        clearInterval(intervalId);
        client.destroy();
        client = null;
    }
};

app.listen(3000, () => console.log('Server is ready'));

// عند بدء تشغيل الخادم، قم بتحميل البيانات المشفرة من الملف إذا كانت موجودة
if (fs.existsSync('config.json')) {
    try {
        const encryptedData = JSON.parse(fs.readFileSync('config.json'));

        const token = decrypt(encryptedData.token);
        const serverId = decrypt(encryptedData.serverId);
        const roomId = decrypt(encryptedData.roomId);
        const message = decrypt(encryptedData.message);
        const interval = parseInt(decrypt(encryptedData.interval));

        startBot(token, roomId, message, interval);
    } catch (error) {
        console.error('Error reading or parsing config.json:', error);
    }
}
