/**
 * Query Router - Classifies queries to AIRA, REX, or OUT_OF_SCOPE
 * 
 * RECORD_QUERY → AIRA (what is true)
 * DECISION_QUERY → REX (what to do)
 * OUT_OF_SCOPE → Refusal
 */

class QueryRouter {
    constructor() {
        // AIRA patterns - records, memory, history, facts
        this.airaPatterns = [
            // Timeline & History
            /when (was|did|were)/i,
            /what (date|time|version)/i,
            /last (updated|modified|changed|edited)/i,
            /history of/i,
            /timeline/i,
            /changelog/i,
            /previous (version|claim|statement)/i,

            // Verification & Status
            /verification status/i,
            /is (it|this) verified/i,
            /what did (i|we) (say|claim|state)/i,
            /original (claim|statement|data)/i,

            // Data Retrieval
            /show me the record/i,
            /what is the current/i,
            /what are the current/i,
            /list (all|my)/i,
            /how many (times|versions)/i,

            // Contradictions & Validation
            /contradiction/i,
            /inconsisten/i,
            /conflict between/i,
            /did (i|we) ever/i,
            /have (i|we) ever/i
        ];

        // REX patterns - decisions, actions, priorities
        this.rexPatterns = [
            // Action Guidance
            /should (i|we)/i,
            /what should/i,
            /next step/i,
            /what to do/i,
            /priority/i,
            /prioritize/i,

            // Recommendations
            /recommend/i,
            /suggest/i,
            /advise/i,
            /which (one|option)/i,
            /better to/i,

            // Gaps & Warnings
            /what('s| is) missing/i,
            /gap in/i,
            /risk/i,
            /warning/i,
            /concern/i,
            /problem with/i,

            // Comparisons
            /compare/i,
            /vs/i,
            /versus/i,
            /difference between/i,

            // Prioritization
            /fix first/i,
            /focus on/i,
            /work on first/i,
            /most important/i,
            /urgent/i
        ];

        // OUT_OF_SCOPE patterns - motivation, emotion, sales, speculation
        this.outOfScopePatterns = [
            /motivat/i,
            /encourage/i,
            /cheer me up/i,
            /feel better/i,
            /inspire/i,
            /sell/i,
            /marketing copy/i,
            /pitch deck/i,
            /imagine if/i,
            /what if we/i,
            /predict the future/i,
            /guess/i,
            /speculate/i,
            /could you pretend/i,
            /roleplay/i,
            /joke/i,
            /funny/i
        ];
    }

    /**
     * Classify query to persona
     * @param {string} query - User query
     * @param {string} forcedPersona - Optional: 'AIRA' or 'REX' if user explicitly selected
     * @returns {{ persona: 'AIRA'|'REX'|'OUT_OF_SCOPE', confidence: number }}
     */
    classify(query, forcedPersona = null) {
        const q = query.toLowerCase().trim();

        // Check OUT_OF_SCOPE first
        for (const pattern of this.outOfScopePatterns) {
            if (pattern.test(q)) {
                return { persona: 'OUT_OF_SCOPE', confidence: 1.0, reason: 'matches_rejection_pattern' };
            }
        }

        // If user explicitly selected a persona, respect it (unless OUT_OF_SCOPE)
        if (forcedPersona === 'AIRA' || forcedPersona === 'REX') {
            return { persona: forcedPersona, confidence: 0.9, reason: 'user_selected' };
        }

        // Pattern matching for AIRA
        for (const pattern of this.airaPatterns) {
            if (pattern.test(q)) {
                return { persona: 'AIRA', confidence: 0.85, reason: 'pattern_match' };
            }
        }

        // Pattern matching for REX
        for (const pattern of this.rexPatterns) {
            if (pattern.test(q)) {
                return { persona: 'REX', confidence: 0.85, reason: 'pattern_match' };
            }
        }

        // Default: If query is phrased as a question about "what" or "how many" → AIRA
        if (/^(what|how many|when|who|where)/i.test(q)) {
            return { persona: 'AIRA', confidence: 0.6, reason: 'default_factual' };
        }

        // Default: If query is phrased as "how to" or "can I" → REX
        if (/^(how to|can i|should|could i)/i.test(q)) {
            return { persona: 'REX', confidence: 0.6, reason: 'default_action' };
        }

        // Fallback: AIRA (safer for records)
        return { persona: 'AIRA', confidence: 0.5, reason: 'fallback' };
    }
}

module.exports = new QueryRouter();
