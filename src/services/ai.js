const OpenAI = require('openai');
const widgets = require('./widgets');

class AIService {
    constructor() {
        this.openai = null;
    }

    _initClient() {
        if (this.openai) return;

        const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
        if (!apiKey) {
            console.error('CRITICAL: OPENAI_API_KEY is missing in environment variables.');
            return;
        }
        this.openai = new OpenAI({ apiKey });
    }

    async reason(userQuery, intent, data, personality = null) {
        this._initClient();

        // ============================================
        // WIDGET-BASED RENDERING (No AI for layout)
        // ============================================

        // Handle cases where we can directly render widgets
        let html = '';
        let summary = '';
        let uiMode = 'mini';
        let suggestions = [];

        // No OpenAI key configured
        if (!this.openai) {
            return {
                uiMode: 'mini',
                html: '<section class="clicky-error"><p>AI Service is not configured correctly (Missing API Key).</p></section>',
                summary: 'Configuration Error.',
                suggestions: []
            };
        }

        // No data found
        if (!data || (Array.isArray(data) && data.length === 0)) {
            return {
                uiMode: 'mini',
                html: '<section class="clicky-error"><p>I couldn\'t find any data matching your request in the Clicktory database.</p></section>',
                summary: 'No matching data found.',
                suggestions: ['Try searching for "Analytics"', 'Show me trending products', 'What categories are available?']
            };
        }

        // ============================================
        // INTENT-SPECIFIC WIDGET RENDERING
        // ============================================

        switch (intent) {
            // --- SAFETY: Refusal for mutation requests ---
            case 'mutation_refused':
                return {
                    uiMode: 'mini',
                    html: '<section class="clicky-error"><p>I\'m a read-only assistant. I cannot delete, modify, or create data. I can only answer questions about products, founders, and public information on Clicktory.</p></section>',
                    summary: 'Request refused: Clicky is read-only.',
                    suggestions: ['Show me trending products', 'How many founders are on Clicktory?', 'What categories are available?']
                };

            case 'search_products':
            case 'list_alternatives':
                html = widgets.productGrid(data);
                summary = `Found ${data.length} product${data.length > 1 ? 's' : ''} matching your search.`;
                uiMode = 'full';
                suggestions = ['Compare top 2', 'Show reviews for the first one', 'What are the trending products?'];
                break;

            case 'explain_product':
                html = widgets.productDetail(data);
                summary = `Here's everything about ${data.name}.`;
                uiMode = 'full';
                suggestions = [`Reviews for ${data.name}`, `Who founded ${data.name}?`, 'Find similar products'];
                break;

            case 'compare_products':
                html = widgets.comparisonTable(data);
                summary = `Side-by-side comparison of ${data.map(p => p.name).join(' vs ')}.`;
                uiMode = 'full';
                suggestions = ['Show reviews for both', 'Find alternatives'];
                break;

            case 'category_overview':
                html = widgets.productGrid(data);
                summary = `${data.length} products in this category.`;
                uiMode = 'full';
                suggestions = ['What are the top rated?', 'Show me trending products'];
                break;

            case 'trending_products':
                html = widgets.statsWidget('Trending Products', data);
                summary = 'Here are the latest trending products on Clicktory.';
                uiMode = 'full';
                suggestions = ['What are the top rated?', 'Browse all categories'];
                break;

            case 'top_rated':
                html = widgets.statsWidget('Top Rated Products', data);
                summary = 'These are the highest rated products by users.';
                uiMode = 'full';
                suggestions = ['Show trending products', 'Reviews for the top one'];
                break;

            case 'category_list':
                html = widgets.categoryPills(data);
                summary = `${data.length} categories available on Clicktory.`;
                uiMode = 'full';
                suggestions = ['Show products in Analytics', 'What are trending products?'];
                break;

            case 'stats_overview':
                html = widgets.platformStats(data);
                summary = `Clicktory has ${data.founders} founders, ${data.products} products, ${data.reviews} reviews across ${data.categories} categories.`;
                uiMode = 'mini';
                suggestions = ['Show all founders', 'List all categories', 'Show trending products'];
                break;

            case 'founder_list':
                html = widgets.founderGrid(data);
                summary = `${data.length} founders on Clicktory.`;
                uiMode = 'full';
                suggestions = ['Show trending products', 'Platform statistics'];
                break;

            case 'founder_lookup':
            case 'founder_profile':
                html = widgets.founderCard(data);
                summary = `Founder profile for ${data.name}.`;
                uiMode = 'mini';
                suggestions = [`Products by ${data.name}`, 'Show trending products'];
                break;

            case 'founder_products':
                html = widgets.productGrid(data);
                summary = `${data.length} product${data.length > 1 ? 's' : ''} by this founder.`;
                uiMode = 'full';
                suggestions = ['Compare them', 'Show reviews'];
                break;

            case 'product_reviews':
                html = widgets.reviewList(data);
                summary = `${data.length} review${data.length > 1 ? 's' : ''} for this product.`;
                uiMode = 'full';
                suggestions = ['Show product details', 'Find similar products'];
                break;

            default:
                // Fallback to AI reasoning for ambiguous queries
                return await this._aiReason(userQuery, intent, data);
        }

        return { uiMode, html, summary, suggestions };
    }

    // ============================================
    // AI REASONING (Fallback for complex queries)
    // ============================================
    async _aiReason(userQuery, intent, data, personality = null) {
        const toneInstruction = personality?.tone || 'Confident, Professional, Honest, No emojis.';

        const systemPrompt = `
You are Clicky, an internal AI product analyst for Clicktory.
Tone: ${toneInstruction}
Output Format: JSON only.
Structure:
{
  "uiMode": "mini" | "full",
  "html": "HTML string to render",
  "summary": "Short text summary",
  "suggestions": ["Follow up 1", "Follow up 2"]
}

Context Data:
${JSON.stringify(data).substring(0, 8000)}

Instructions:
1. Answer the User Query based ONLY on the Context Data.
2. If data is missing, admit it. Do not hallucinate.
3. Generate clean, semantic HTML string (<section>, <h3>, <ul>, <p>, <table>).
4. Apply class names: 'clicky-section', 'clicky-title', 'clicky-list', 'clicky-table', 'clicky-badge'.
5. Keep responses concise and actionable.
`;

        try {
            const completion = await this.openai.chat.completions.create({
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: `Intent: ${intent}\nQuery: ${userQuery}` }
                ],
                model: "gpt-4o",
                response_format: { type: "json_object" }
            });

            return JSON.parse(completion.choices[0].message.content);
        } catch (err) {
            console.error('AI Error:', err);
            return {
                uiMode: 'mini',
                html: '<section class="clicky-error"><p>My reasoning engine encountered an issue.</p></section>',
                summary: 'AI processing failed.',
                suggestions: ['Try a simpler query', 'Show trending products']
            };
        }
    }
}

module.exports = new AIService();
