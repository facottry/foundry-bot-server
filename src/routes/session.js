const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// In-memory cache for active personality
let cachedPersonality = null;
let cacheExpiry = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// Fetch active personality from adminserver
async function fetchActivePersonality() {
    const now = Date.now();

    // Return cached if still valid
    if (cachedPersonality && now < cacheExpiry) {
        return cachedPersonality;
    }

    try {
        const adminServerUrl = process.env.ADMIN_SERVER_URL || 'http://localhost:5001';
        const response = await fetch(`${adminServerUrl}/api/admin/personalities/active`);

        if (response.ok) {
            cachedPersonality = await response.json();
            cacheExpiry = now + CACHE_DURATION_MS;
            console.log('[Clicky] Personality loaded:', cachedPersonality.name);
            return cachedPersonality;
        }
    } catch (error) {
        console.error('[Clicky] Failed to fetch personality:', error.message);
    }

    // Return default if fetch fails
    return {
        name: 'Default',
        tone: 'Professional, confident, and helpful. Answer questions directly without unnecessary pleasantries.',
        greeting: 'Hello! I\'m Clicky, your Foundry assistant. How can I help you today?'
    };
}

// Session start endpoint - called once when user opens widget
router.post('/start', authMiddleware, async (req, res) => {
    try {
        const personality = await fetchActivePersonality();

        res.json({
            sessionId: `session_${Date.now()}_${req.user.id}`,
            personality: {
                name: personality.name,
                greeting: personality.greeting
            }
        });
    } catch (error) {
        console.error('[Clicky] Session Start Error:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// Force refresh personality cache (for admin use)
router.post('/refresh-personality', authMiddleware, async (req, res) => {
    cachedPersonality = null;
    cacheExpiry = 0;
    const personality = await fetchActivePersonality();
    res.json({ message: 'Personality cache refreshed', personality: personality.name });
});

// Export for use in AI service
module.exports = router;
module.exports.fetchActivePersonality = fetchActivePersonality;
