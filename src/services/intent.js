class IntentEngine {
    classify(query) {
        const q = query.toLowerCase();

        // --- SAFETY: Reject Mutation/Destructive Requests FIRST ---
        const mutationKeywords = ['delete', 'remove', 'drop', 'destroy', 'clear', 'wipe', 'erase', 'update', 'modify', 'change', 'edit', 'add', 'create', 'insert', 'reset', 'ban', 'block', 'hack', 'inject'];
        if (mutationKeywords.some(kw => q.includes(kw))) {
            return { intent: 'mutation_refused', confidence: 1.0 };
        }

        // --- Review Intent ---
        if (q.includes('review') || q.includes('feedback') || q.includes('what people say') || q.includes('opinions')) {
            return { intent: 'product_reviews', confidence: 0.9 };
        }

        // --- Trending Intent ---
        if (q.includes('trending') || q.includes('popular') || q.includes('hot') || q.includes('new products') || q.includes('latest')) {
            return { intent: 'trending_products', confidence: 0.9 };
        }

        // --- Top Rated Intent ---
        if (q.includes('best') || q.includes('top rated') || q.includes('highest rated') || q.includes('top 10')) {
            return { intent: 'top_rated', confidence: 0.9 };
        }

        // --- Compare Intent ---
        if (q.includes('compare') || q.includes('vs') || q.includes('versus') || q.includes('difference between')) {
            return { intent: 'compare_products', confidence: 0.9 };
        }

        // --- Alternative Intent ---
        if (q.includes('alternative') || q.includes('like') || q.includes('similar to') || q.includes('instead of')) {
            return { intent: 'list_alternatives', confidence: 0.9 };
        }

        // --- Founder Profile Intent ---
        if (q.includes('who founded') || q.includes('who made') || q.includes('who created') || q.includes('founder of') || q.includes('about the founder')) {
            return { intent: 'founder_profile', confidence: 0.9 };
        }

        // --- Founder Products Intent ---
        if (q.includes('products by') || q.includes('made by') || q.includes('built by') || q.includes('from founder')) {
            return { intent: 'founder_products', confidence: 0.85 };
        }

        // --- Stats Overview Intent (counts, totals) ---
        if (q.includes('how many') || q.includes('total') || q.includes('count') || q.includes('statistics') || q.includes('stats')) {
            return { intent: 'stats_overview', confidence: 0.9 };
        }

        // --- List All Founders Intent ---
        if (q.includes('all founders') || q.includes('list founders') || q.includes('founders on') || q.includes('show founders')) {
            return { intent: 'founder_list', confidence: 0.9 };
        }

        // --- Category List Intent ---
        if (q.includes('all categories') || q.includes('list categories') || q.includes('what categories') || q.includes('browse categories')) {
            return { intent: 'category_list', confidence: 0.9 };
        }

        // --- Category Overview Intent ---
        if (q.includes('category') || q.includes('products in') || q.includes('tools for')) {
            return { intent: 'category_overview', confidence: 0.8 };
        }

        // --- Explain Intent ---
        if (q.includes('what is') || q.includes('explain') || q.includes('tell me about') || q.includes('describe')) {
            return { intent: 'explain_product', confidence: 0.85 };
        }

        // --- Search Intent ---
        if (q.includes('search') || q.includes('find') || q.includes('show me') || q.includes('looking for')) {
            return { intent: 'search_products', confidence: 0.8 };
        }

        // Default to search if nothing explicit matches
        return { intent: 'search_products', confidence: 0.5 };
    }
}

module.exports = new IntentEngine();
