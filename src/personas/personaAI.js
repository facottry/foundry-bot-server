/**
 * Persona AI Service - Handles AIRA/REX responses with strict rules
 */

const OpenAI = require('openai');
const { AIRA_SYSTEM_PROMPT, REX_SYSTEM_PROMPT, OUT_OF_SCOPE_RESPONSE } = require('./prompts');
const queryRouter = require('./router');
const validator = require('./validator');
const { fetchPersonalityByMode } = require('../routes/session');

class PersonaAI {
    constructor() {
        this.openai = null;
    }

    _initClient() {
        if (this.openai) return;

        const apiKey = process.env.FOUNDRY_OPENAI_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('[PersonaAI] CRITICAL: OpenAI API key missing');
            return;
        }
        this.openai = new OpenAI({ apiKey });
    }

    /**
     * Get response format rules to append to dynamic tone
     */
    _getResponseFormatRules(persona) {
        return `

RESPONSE RULES:
- No emojis, no casual language
- Conservative answers preferred
- Authority > helpfulness
- No "as an AI language model"
- No motivational content

OUTPUT FORMAT (STRICT JSON):
{
  "persona": "${persona}",
  "answer": "string",
  "confidence": 0.0-1.0,
  "source": ["record_type", "timestamp"],
  "notes": "optional"
}

If no data: confidence = 0.0, source = []`;
    }

    /**
     * Process query through AIRA or REX
     * @param {string} query - User query
     * @param {object} context - Founder/product data context
     * @param {string} forcedPersona - Optional: 'AIRA' or 'REX'
     * @param {string} mode - 'mini' or 'full' (determines persona)
     */
    async process(query, context = {}, forcedPersona = null, mode = null) {
        this._initClient();

        if (!this.openai) {
            return {
                persona: null,
                answer: 'AI service is not configured.',
                confidence: 0.0,
                source: [],
                notes: 'MISSING_API_KEY'
            };
        }

        // Route query to persona
        const routing = queryRouter.classify(query, forcedPersona);
        console.log(`[PersonaAI] Query: "${query}" → ${routing.persona} (${routing.confidence})`);

        // Handle OUT_OF_SCOPE
        if (routing.persona === 'OUT_OF_SCOPE') {
            return OUT_OF_SCOPE_RESPONSE;
        }

        // Get appropriate system prompt - prefer dynamic from adminserver
        let systemPrompt;
        const targetMode = routing.persona === 'AIRA' ? 'mini' : 'full';

        try {
            const personality = await fetchPersonalityByMode(mode || targetMode);
            if (personality && personality.tone) {
                // Use dynamic tone from adminserver
                systemPrompt = personality.tone + this._getResponseFormatRules(routing.persona);
                console.log(`[PersonaAI] Using dynamic tone for mode: ${targetMode}`);
            } else {
                throw new Error('No dynamic tone available');
            }
        } catch (err) {
            // Fallback to static prompts
            console.log(`[PersonaAI] Falling back to static prompt`);
            systemPrompt = routing.persona === 'AIRA'
                ? AIRA_SYSTEM_PROMPT
                : REX_SYSTEM_PROMPT;
        }

        // Build context string
        const contextStr = this._buildContext(context);

        // Generate response
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `AVAILABLE DATA:\n${contextStr}\n\nQUERY: ${query}` }
                ],
                temperature: 0.3, // Low for factual responses
                max_tokens: 500
            });

            const rawResponse = completion.choices[0]?.message?.content || '';

            // Parse and validate response
            const parsed = validator.parseAIResponse(rawResponse);
            const { valid, response, errors } = validator.validate(parsed, routing.persona);

            if (!valid) {
                console.warn('[PersonaAI] Validation errors:', errors);
            }

            return response;

        } catch (error) {
            console.error('[PersonaAI] Error:', error.message);
            return {
                persona: routing.persona,
                answer: 'Unable to process query at this time.',
                confidence: 0.0,
                source: [],
                notes: error.message
            };
        }
    }

    /**
     * Build context string from founder/product data
     */
    _buildContext(context) {
        if (!context || Object.keys(context).length === 0) {
            return 'NO DATA AVAILABLE';
        }

        const sections = [];

        // Product data
        if (context.product) {
            sections.push(`PRODUCT RECORD:\n${JSON.stringify(context.product, null, 2)}`);
        }

        // Founder data
        if (context.founder) {
            sections.push(`FOUNDER RECORD:\n${JSON.stringify(context.founder, null, 2)}`);
        }

        // Timeline/changelog
        if (context.changelog && context.changelog.length > 0) {
            sections.push(`CHANGELOG:\n${context.changelog.map(c =>
                `- ${c.date}: ${c.action} (${c.field || 'general'})`
            ).join('\n')}`);
        }

        // Roadmap
        if (context.roadmap && context.roadmap.length > 0) {
            sections.push(`ROADMAP:\n${context.roadmap.map(r =>
                `- ${r.status}: ${r.title} (${r.target_date || 'no date'})`
            ).join('\n')}`);
        }

        // Verification status
        if (context.verification) {
            sections.push(`VERIFICATION STATUS:\n${JSON.stringify(context.verification, null, 2)}`);
        }

        // Metrics
        if (context.metrics) {
            sections.push(`METRICS:\n${JSON.stringify(context.metrics, null, 2)}`);
        }

        return sections.join('\n\n---\n\n') || 'NO DATA AVAILABLE';
    }
}

module.exports = new PersonaAI();
