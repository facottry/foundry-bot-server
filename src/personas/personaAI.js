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

        // ---------------------------------------------------------
        // PHASE 2: INTENT GATING (Offline Fallback)
        // If API key is missing, we MUST still handle greetings (Conversational Intent)
        // ---------------------------------------------------------
        if (!this.openai) {
            const isGreeting = /^(hi|hello|hey|greetings|good morning|good evening)/i.test(query.trim());
            if (isGreeting) {
                console.log('[PersonaAI] Offline Greeting Fallback Triggered');
                return {
                    persona: forcedPersona || 'REX', // Default to REX in offline mode
                    answer: "Hello! I am REX, your Reality & Execution Assistant. My brain is currently offline (Missing API Key), but I'm here!",
                    confidence: 1.0,
                    source: ['system_fallback'],
                    notes: 'OFFLINE_MODE'
                };
            }

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

        // ---------------------------------------------------------
        // PHASE 2: INJECT RESPONSE CONTRACT (The Enforcer)
        // ---------------------------------------------------------
        const { PHASE2_RESPONSE_CONTRACT } = require('./prompts');
        const finalSystemPrompt = systemPrompt + "\n\n" + PHASE2_RESPONSE_CONTRACT;

        // ---------------------------------------------------------
        // PHASE 3: ACTION ROUTER (The Doer)
        // ---------------------------------------------------------
        // Simple Regex Intent Matching for Enablement
        // "Rename my product to X"
        const renameMatch = query.match(/rename my product to ["']?([^"']+)["']?/i);
        let actionResult = null;

        if (renameMatch && context.product && context.founder) {
            const newName = renameMatch[1];
            try {
                console.log(`[PersonaAI] Action Triggered: Rename Product -> ${newName}`);
                const founderDataService = require('../personas/founderData');
                await founderDataService.updateProduct(context.founder._id, context.product.id, { name: newName });

                // Update context for the AI
                context.product.name = newName;
                actionResult = `SYSTEM_NOTE: Product successfully renamed to "${newName}". Inform the user.`;
            } catch (err) {
                console.error('[PersonaAI] Action Failed:', err);
                actionResult = `SYSTEM_ERROR: Failed to rename product. Reason: ${err.message}`;
            }
        }

        // Generic "Update X to Y" Matcher
        // Regex: (change|update|set) (field) (of product name)? to (value)
        const updateRegex = /(?:change|update|set)\s+(biography|bio|tagline|description|website|company\s+name)(?:\s+(?:of|for)(?:\s+my)?(?:\s+product)?\s+["']?([^"']+)["']?)?\s+to\s+["']?([^"']+)["']?/i;
        console.log(`[PersonaAI] Action Check: Query="${query}"`);
        const updateMatch = query.match(updateRegex);
        if (updateMatch) {
            console.log(`[PersonaAI] Action Logic Match! Field=${updateMatch[1]}, Target=${updateMatch[2]}, Value=${updateMatch[3]}`);
        } else {
            console.log(`[PersonaAI] Action Logic NO MATCH`);
        }

        if (!actionResult && updateMatch && context.founder) {
            const rawField = updateMatch[1].toLowerCase();
            const targetName = updateMatch[2]; // Optional: "OpenClaw"
            const value = updateMatch[3];

            const fieldMap = {
                'tagline': 'tagline',
                'description': 'description',
                'website': 'website_url',
                'biography': 'bio',
                'bio': 'bio',
                'company name': 'company_name'
            };
            const dbField = fieldMap[rawField] || rawField;

            // Resolve Target Product
            let targetProduct = context.product; // Default

            if (targetName && context.products) {
                // Fuzzy match name
                const found = context.products.find(p => p.name.toLowerCase() === targetName.toLowerCase() || p.slug === targetName.toLowerCase());
                if (found) {
                    targetProduct = found;
                } else {
                    // Action blocked: Product specified but not found
                    actionResult = `SYSTEM_NOTE: User wants to update product "${targetName}" but it was not found in their records. Ask them to provide the exact Name or Slug.`;
                    targetProduct = null; // Prevent execution
                }
            }

            // Execute if we have a target and valid field
            if (targetProduct && ['tagline', 'description', 'website_url'].includes(dbField)) {
                try {
                    console.log(`[PersonaAI] Action Triggered: Update Product ${targetProduct.name} (${dbField}) -> ${value}`);
                    const founderDataService = require('../personas/founderData');
                    await founderDataService.updateProduct(context.founder._id, targetProduct.id, { [dbField]: value });

                    // Update context (shallow)
                    targetProduct[dbField] = value;
                    if (context.product && context.product.id === targetProduct.id) {
                        context.product[dbField] = value;
                    }

                    actionResult = `SYSTEM_NOTE: Product "${targetProduct.name}" ${dbField} updated to "${value}".`;
                } catch (err) {
                    actionResult = `SYSTEM_ERROR: Update failed: ${err.message}`;
                }
            }
        }

        // Build context string
        console.log('[PersonaAI] Received Context Keys:', Object.keys(context));
        if (context.founder) console.log('[PersonaAI] Founder Context:', context.founder.name);

        let contextStr = this._buildContext(context);

        // Append Action Result to Context if exists
        if (actionResult) {
            contextStr += `\n\n[RECENT ACTION RESULT]: ${actionResult}`;
        }


        // Generate response
        try {
            const completion = await this.openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: finalSystemPrompt },
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

        // DB SCHEMA (For Awareness)
        const { getDatabaseSchemaSummary } = require('./db_context');
        sections.push(getDatabaseSchemaSummary());

        // Metrics
        if (context.metrics) {
            sections.push(`METRICS:\n${JSON.stringify(context.metrics, null, 2)}`);
        }

        return sections.join('\n\n---\n\n') || 'NO DATA AVAILABLE';
    }
}

module.exports = new PersonaAI();
