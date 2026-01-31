const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// In-memory cache for personalities by mode
const personalityCache = {
    mini: { data: null, expiry: 0 },
    full: { data: null, expiry: 0 }
};
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch personality by mode from adminserver
 * Customer never sees persona name - only tone and greeting
 * 
 * @param {string} mode - 'mini' or 'full'
 * @returns {Object} - { tone, greeting }
 */
async function fetchPersonalityByMode(mode) {
    const now = Date.now();
    const cache = personalityCache[mode];

    // Return cached if still valid
    if (cache && cache.data && now < cache.expiry) {
        return cache.data;
    }

    try {
        const adminServerUrl = process.env.ADMIN_SERVER_URL || 'http://localhost:5001';
        const response = await fetch(`${adminServerUrl}/api/admin/personalities/mode/${mode}`);

        if (response.ok) {
            const personality = await response.json();
            personalityCache[mode] = {
                data: personality,
                expiry: now + CACHE_DURATION_MS
            };
            console.log(`[Clicky] Personality loaded for mode: ${mode}`);
            return personality;
        }
    } catch (error) {
        console.error(`[Clicky] Failed to fetch personality for ${mode}:`, error.message);
    }

    // Return hardcoded defaults if fetch fails
    if (mode === 'mini') {
        return {
            tone: 'You are AIRA - Archive & Intelligence Record Assistant. Role: Records, Memory, Truth. Be factual and neutral.',
            greeting: 'AIRA active. What record do you need?'
        };
    } else {
        return {
            tone: 'You are REX - Reality & Execution Assistant. Role: Decisions, Actions. Be direct and practical.',
            greeting: 'REX ready. What decision needs clarity?'
        };
    }
}

// Session start endpoint - called once when user opens widget
// Body: { mode: 'mini' | 'full' }
router.post('/start', authMiddleware, async (req, res) => {
    try {
        const mode = req.body.mode || 'mini'; // Default to mini mode

        if (!['mini', 'full'].includes(mode)) {
            return res.status(400).json({ error: 'Invalid mode. Must be mini or full' });
        }

        const personality = await fetchPersonalityByMode(mode);

        // Customer sees only greeting - NO persona name exposed
        res.json({
            sessionId: `session_${Date.now()}_${req.user.id}`,
            mode: mode,
            greeting: personality.greeting
        });
    } catch (error) {
        console.error('[Clicky] Session Start Error:', error);
        res.status(500).json({ error: 'Failed to start session' });
    }
});

// Get personality config for AI service (internal use)
router.get('/personality/:mode', authMiddleware, async (req, res) => {
    try {
        const { mode } = req.params;

        if (!['mini', 'full'].includes(mode)) {
            return res.status(400).json({ error: 'Invalid mode' });
        }

        const personality = await fetchPersonalityByMode(mode);
        res.json(personality);
    } catch (error) {
        console.error('[Clicky] Get Personality Error:', error);
        res.status(500).json({ error: 'Failed to get personality' });
    }
});

// Force refresh personality cache (for admin use)
router.post('/refresh-personality', authMiddleware, async (req, res) => {
    personalityCache.mini = { data: null, expiry: 0 };
    personalityCache.full = { data: null, expiry: 0 };

    const [mini, full] = await Promise.all([
        fetchPersonalityByMode('mini'),
        fetchPersonalityByMode('full')
    ]);

    res.json({
        message: 'Personality cache refreshed',
        mini: !!mini,
        full: !!full
    });
});

// Export for use in AI service
module.exports = router;
module.exports.fetchPersonalityByMode = fetchPersonalityByMode;
