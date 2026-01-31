/**
 * Persona Routes - AIRA/REX query endpoint
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const personaAI = require('../personas/personaAI');
const founderDataService = require('../personas/founderData');
const sessionManager = require('../services/sessionManager');
const SessionLog = require('../models/SessionLog'); // Pre-load

/**
 * POST /api/persona/ask
 * Main endpoint for AIRA/REX queries
 * body: { query, mode, persona?, forcedPersona?, context?, sessionId? }
 */
// @route   POST /api/persona/ask
// @desc    Unified endpoint for AIRA/REX
router.post('/ask', authMiddleware.optional, async (req, res) => {
    try {
        const { query, mode, context, sessionId } = req.body;
        const forcedPersona = req.body.forcedPersona || req.body.persona;

        if (!query) return res.status(400).json({ error: 'Query required' });

        // 1. Session Management (Strict Contract)
        const activeSessionId = sessionId || `sess_${Math.random().toString(36).substr(2, 9)}`;
        const session = sessionManager.getSession(activeSessionId);

        // Update session with latest user action
        sessionManager.updateSession(activeSessionId, {
            last_user_message: query,
            mode: mode || session.mode || 'mini'
        });

        // 2. Identify User / Founder
        console.log('[Persona Route] Debug - Headers:', req.headers.authorization ? 'Present' : 'Missing');
        const founderId = req.user ? (req.user.id || (req.user.user && req.user.user.id)) : null;
        console.log('[Persona Route] Debug - FounderID:', founderId);

        if (!query || typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({
                persona: null,
                answer: 'Query is required.',
                confidence: 0.0,
                source: [],
                notes: 'INVALID_REQUEST'
            });
        }

        let finalContext = {};

        // 3. User Data Retrieval (Phase 2: Permissive Auth)
        if (founderId) {
            finalContext = await founderDataService.getFounderContext(founderId);

            // Context Expansion: Market Awareness
            // If query mentions "similar" or "competitor", fetch market data
            if (query.match(/(similar|competitor|alternative)/i)) {
                console.log('[PersonaRoute] Triggering Market Search...');
                const targetProduct = finalContext.product ? finalContext.product.name : null;
                const matches = await founderDataService.findSimilarProducts(targetProduct);
                finalContext.market_landscape = matches;
            }
        }

        // Debug Context
        console.log(`[PersonaRoute] Processing Query for FounderID: ${founderId} (${typeof founderId})`);
        console.log(`[PersonaRoute] Context Keys: ${Object.keys(finalContext)}`);
        if (finalContext.products) {
            console.log(`[PersonaRoute] Products Found: ${finalContext.products.length}`);
        } else {
            console.log(`[PersonaRoute] No Products in Context`);
        }

        // Process through persona AI
        const response = await personaAI.process(query, finalContext, forcedPersona, mode);

        // 3. Update Session with Bot Reply
        sessionManager.updateSession(activeSessionId, {
            last_bot_reply: response.answer,
            active_persona: response.persona
        });

        // Return session ID to ensure frontend keeps it
        res.json({
            ...response,
            sessionId: activeSessionId
        });

        // 4. Persistent Logging (Async - Post Response)
        (async () => {
            try {
                await SessionLog.findOneAndUpdate(
                    { sessionId: activeSessionId },
                    {
                        $setOnInsert: {
                            sessionId: activeSessionId,
                            userId: req.user ? req.user.id : null,
                            founderId: founderId,
                            mode: mode || 'mini',
                            createdAt: new Date()
                        },
                        $set: { lastUpdatedAt: new Date() },
                        $push: {
                            interactions: {
                                query: query,
                                answer: response.answer,
                                persona: response.persona,
                                timestamp: new Date(),
                                meta: {
                                    confidence: response.confidence,
                                    source: response.source,
                                    notes: response.notes
                                }
                            }
                        }
                    },
                    { upsert: true, new: true }
                );
            } catch (logErr) {
                console.error('[SessionLog] Error logging interaction:', logErr.message);
            }
        })();

    } catch (error) {
        console.error('[Persona Route] Error:', error);
        res.status(500).json({
            persona: null,
            answer: 'Unable to process query due to a system error.',
            confidence: 0.0,
            source: [],
            notes: `INTERNAL_ERROR: ${error.message}`
        });
    }
});

/**
 * GET /api/persona/info
 * Returns persona descriptions for UI
 */
router.get('/info', authMiddleware, (req, res) => {
    res.json({
        personas: [
            {
                id: 'AIRA',
                name: 'AIRA',
                fullName: 'Archive & Intelligence Record Assistant',
                gender: 'Female',
                role: 'Records & Memory',
                description: 'Answers questions about timelines, edits, past claims, verification status.',
                examples: [
                    'When was my roadmap last updated?',
                    'What did I claim about our launch date?',
                    'Show me the product changelog'
                ]
            },
            {
                id: 'REX',
                name: 'REX',
                fullName: 'Reality & Execution Assistant',
                gender: 'Male',
                role: 'Decisions & Actions',
                description: 'Suggests next actions, highlights gaps, prioritizes what to fix.',
                examples: [
                    'Should I update roadmap or hiring first?',
                    'What credibility gaps should I fix?',
                    'What should I focus on this week?'
                ]
            }
        ]
    });
});

module.exports = router;
