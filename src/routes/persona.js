/**
 * Persona Routes - AIRA/REX query endpoint
 */

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const personaAI = require('../personas/personaAI');
const founderDataService = require('../personas/founderData');

/**
 * POST /api/persona/ask
 * Main endpoint for AIRA/REX queries
 * 
 * Body:
 * - query: string (required)
 * - persona: 'AIRA' | 'REX' (optional, auto-routes if not provided)
 * - productId: string (optional, for product-specific context)
 */
router.post('/ask', authMiddleware, async (req, res) => {
    try {
        const { query, persona, productId } = req.body;
        const founderId = req.user.id;

        if (!query || typeof query !== 'string' || !query.trim()) {
            return res.status(400).json({
                persona: null,
                answer: 'Query is required.',
                confidence: 0.0,
                source: [],
                notes: 'INVALID_REQUEST'
            });
        }

        // Get context based on request
        let context = {};
        if (productId) {
            context = await founderDataService.getProductContext(productId);
        } else {
            context = await founderDataService.getFounderContext(founderId);
        }

        // Process through persona AI
        const response = await personaAI.process(
            query.trim(),
            context,
            persona // null if not provided, will auto-route
        );

        res.json(response);

    } catch (error) {
        console.error('[Persona Route] Error:', error);
        res.status(500).json({
            persona: null,
            answer: 'Unable to process query.',
            confidence: 0.0,
            source: [],
            notes: 'INTERNAL_ERROR'
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
