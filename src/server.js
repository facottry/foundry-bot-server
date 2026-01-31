require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const authMiddleware = require('./middleware/auth');
const intentEngine = require('./services/intent');
const mongoService = require('./services/mongo');
const aiService = require('./services/ai');
const rateLimit = require('express-rate-limit');
const sessionRoutes = require('./routes/session');
const { fetchActivePersonality } = require('./routes/session');

const app = express();

// Security & Parsing
app.use(helmet());
app.use(cors({ origin: process.env.Origin || '*' }));
app.use(express.json());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    keyGenerator: (req, res) => {
        return req.user ? req.user.id : req.ip;
    },
    standardHeaders: true,
    legacyHeaders: false,
    validate: {
        xForwardedForHeader: false,
        defaultKeyGenerator: false // specific to express-rate-limit v7+
    }
});

// Database Connection
mongoService.connect().catch(console.error);

// Health Check
app.get('/health', (req, res) => res.send('OK'));

// Session Routes (for personality initialization)
app.use('/api/session', sessionRoutes);

// Persona Routes (AIRA + REX)
app.use('/api/persona', require('./routes/persona'));

// Main Query Endpoint
app.post('/api/query', authMiddleware, async (req, res) => {
    try {
        const { query, context } = req.body;

        if (!query) return res.status(400).json({ error: 'Query required' });

        // 1. Intent Classification
        const { intent, confidence } = intentEngine.classify(query);
        console.log(`[Clicky] User: ${req.user.id} | Query: "${query}" | Intent: ${intent} (${confidence})`);

        // 2. Data Retrieval
        const data = await mongoService.executeQuery(intent, query);

        // 3. Fetch Active Personality (cached)
        const personality = await fetchActivePersonality();

        // 4. AI Reasoning & Response Generation
        const response = await aiService.reason(query, intent, data, personality);

        res.json(response);

    } catch (error) {
        console.error('Query Error:', error);
        res.status(500).json({
            uiMode: 'mini',
            html: '<section class="clicky-error">Internal Server Error</section>',
            summary: 'System error.',
            suggestions: []
        });
    }
});

const PORT = process.env.PORT || 5003;
app.listen(PORT, () => {
    console.log(`Clicky BotServer running on port ${PORT}`);
});

