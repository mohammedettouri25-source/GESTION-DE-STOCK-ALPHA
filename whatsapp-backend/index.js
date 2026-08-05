require('dotenv').config();
const express = require('express');
const { Server } = require('socket.io');
const http = require('http');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const cors = require('cors');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

let botEnabled = false;
let systemPrompt = '';
let openaiKey = '';
let openaiClient = null;

// Simple memory store to keep track of chat history per user
const chatHistory = new Map();

// Catch uncaught exceptions to prevent crashing the Node process
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err.message);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

let qrCodeData = null;
let isConnected = false;
let client;

function initializeWhatsAppClient() {
    client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: true,
            args: [
                '--no-sandbox', 
                '--disable-setuid-sandbox',
                '--disable-extensions',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ],
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        qrcode.generate(qr, { small: true });
        qrCodeData = qr;
        io.emit('qr', qr);
        console.log('QR Code generated. Scan it with WhatsApp.');
    });

    client.on('ready', () => {
        console.log('Client is ready!');
        isConnected = true;
        qrCodeData = null;
        io.emit('ready');
    });

    client.on('authenticated', () => {
        console.log('AUTHENTICATED');
    });

    client.on('auth_failure', msg => {
        console.error('AUTHENTICATION FAILURE', msg);
        io.emit('auth_failure', msg);
    });

    client.on('disconnected', async (reason) => {
        console.log('Client was logged out', reason);
        isConnected = false;
        qrCodeData = null;
        io.emit('disconnected', reason);
        
        try {
            await client.destroy();
            console.log('Client destroyed.');
        } catch (e) {
            console.error('Error destroying client:', e);
        }
        
        // Cleanup the session folder to ensure a fresh QR scan
        const authFolder = path.join(__dirname, '.wwebjs_auth');
        if (fs.existsSync(authFolder)) {
            try {
                fs.rmSync(authFolder, { recursive: true, force: true });
                console.log('Session folder deleted successfully.');
            } catch (err) {
                console.error('Error deleting session folder:', err);
            }
        }
        
        // Reinitialize the client to get a new QR code
        setTimeout(() => {
            console.log('Re-initializing WhatsApp client...');
            initializeWhatsAppClient();
        }, 3000);
    });

    client.on('message', async msg => {
        console.log(`MESSAGE RECEIVED from ${msg.from}: ${msg.body}`);
        io.emit('message', {
            from: msg.from,
            body: msg.body,
            isGroup: msg.isGroupMsg
        });

        if (botEnabled && !msg.isGroupMsg && openaiClient) {
            try {
                // Retrieve history
                if (!chatHistory.has(msg.from)) {
                    chatHistory.set(msg.from, [
                        { role: 'system', content: systemPrompt }
                    ]);
                }
                
                const history = chatHistory.get(msg.from);
                history.push({ role: 'user', content: msg.body });
                
                // Limit history to last 10 messages to save tokens
                if (history.length > 11) {
                    // Keep the system prompt at index 0, and slice the rest
                    const recent = history.slice(history.length - 10);
                    chatHistory.set(msg.from, [history[0], ...recent]);
                }

                const response = await openaiClient.chat.completions.create({
                    model: 'gpt-4o-mini',
                    messages: chatHistory.get(msg.from),
                    temperature: 0.7,
                    max_tokens: 300,
                });

                const replyText = response.choices[0].message.content;
                history.push({ role: 'assistant', content: replyText });
                
                // Send reply to user
                await client.sendMessage(msg.from, replyText);
                
                // Also notify the frontend about the AI reply
                io.emit('message', {
                    from: 'AI_BOT',
                    to: msg.from,
                    body: replyText,
                    isGroup: false
                });

            } catch (error) {
                console.error('OpenAI Error:', error.message);
            }
        }
    });

    client.initialize();
}

// API Routes
app.get('/status', (req, res) => {
    res.json({ isConnected, qr: qrCodeData });
});

app.get('/reset-whatsapp', async (req, res) => {
    const authFolder = path.join(__dirname, '.wwebjs_auth');
    try {
        if (client) {
            await client.destroy().catch(console.error);
            // Wait a moment for Chrome to fully close and release file locks
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
        }
        setTimeout(() => {
            initializeWhatsAppClient();
        }, 2000);
        res.send('✅ الجلسة تم مسحها بنجاح! السيرفر كيعاود يخدم دابا. تقدر ترجع للموقع وتسنى QR Code يطلع ليك.');
    } catch (err) {
        res.status(500).send('❌ وقع مشكل ملي حاولت نمسح الجلسة: ' + err.message);
    }
});

app.post('/bot-settings', (req, res) => {
    const { enabled, prompt, apiKey } = req.body;
    botEnabled = enabled;
    systemPrompt = prompt;
    openaiKey = apiKey;
    
    if (apiKey && apiKey.startsWith('sk-')) {
        openaiClient = new OpenAI({ apiKey: openaiKey });
    }
    
    console.log('Bot settings updated:', { enabled, hasApiKey: !!apiKey });
    res.json({ success: true });
});

app.post('/send-message', async (req, res) => {
    let { phone, message } = req.body;
    if (!phone || !message) return res.status(400).json({ error: 'Missing phone or message' });
    if (!isConnected) return res.status(400).json({ error: 'WhatsApp client not connected' });
    
    try {
        let cleanPhone = String(phone).replace(/\D/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '212' + cleanPhone.substring(1);
        }
        const chatId = cleanPhone.includes('@c.us') ? cleanPhone : `${cleanPhone}@c.us`;
        await client.sendMessage(chatId, message);
        console.log(`✅ Automated WhatsApp message sent to ${cleanPhone}`);
        res.json({ success: true, target: cleanPhone });
    } catch (err) {
        console.error('❌ Error sending WhatsApp message:', err.message);
        res.status(500).json({ error: err.message });
    }
});

io.on('connection', (socket) => {
    console.log('Frontend connected via WebSocket');
    
    socket.emit('status', { isConnected, qr: qrCodeData });
    if (qrCodeData) {
        socket.emit('qr', qrCodeData);
    }

    socket.on('disconnect', () => {
        console.log('Frontend disconnected');
    });
});

const PORT = process.env.PORT || 3001;

initializeWhatsAppClient();

server.listen(PORT, () => {
    console.log(`WhatsApp Backend Server is running on port ${PORT}`);
});
