/**
 * Response Validator - Ensures strict JSON format and safety rules
 */

class ResponseValidator {
    /**
     * Validate and normalize AI response
     * @param {object} response - Parsed response from AI
     * @param {string} expectedPersona - 'AIRA' or 'REX'
     * @returns {{ valid: boolean, response: object, errors: string[] }}
     */
    validate(response, expectedPersona) {
        const errors = [];

        // Check required fields
        if (!response.persona) {
            response.persona = expectedPersona;
        }

        if (response.persona !== expectedPersona) {
            errors.push(`Persona mismatch: expected ${expectedPersona}, got ${response.persona}`);
            response.persona = expectedPersona;
        }

        if (typeof response.answer !== 'string' || !response.answer.trim()) {
            errors.push('Missing or invalid answer field');
            response.answer = 'Unable to process this request.';
        }

        if (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1) {
            errors.push('Invalid confidence value');
            response.confidence = 0.0;
        }

        if (!Array.isArray(response.source)) {
            response.source = [];
        }

        // Safety checks
        const safetyViolations = this.checkSafetyRules(response.answer);
        if (safetyViolations.length > 0) {
            errors.push(...safetyViolations);
            // Sanitize unsafe content
            response.answer = this.sanitize(response.answer);
        }

        return {
            valid: errors.length === 0,
            response,
            errors
        };
    }

    /**
     * Check for forbidden content
     */
    checkSafetyRules(answer) {
        const violations = [];
        const lowerAnswer = answer.toLowerCase();

        // Check for "as an AI language model" pattern
        if (/as an? (ai|artificial intelligence|language model)/i.test(answer)) {
            violations.push('Contains forbidden "as an AI" phrase');
        }

        // Check for motivational content
        const motivationalPatterns = [
            /you (can|got) (do|this)/i,
            /believe in yourself/i,
            /don't give up/i,
            /keep going/i,
            /you're doing great/i,
            /proud of you/i
        ];
        for (const pattern of motivationalPatterns) {
            if (pattern.test(answer)) {
                violations.push('Contains motivational content');
                break;
            }
        }

        // Check for speculation markers
        const speculationPatterns = [
            /i think/i,
            /probably/i,
            /maybe/i,
            /might be/i,
            /could be/i,
            /i believe/i,
            /i feel/i,
            /in my opinion/i
        ];
        for (const pattern of speculationPatterns) {
            if (pattern.test(answer)) {
                violations.push('Contains speculative language');
                break;
            }
        }

        // Check for emojis
        const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
        if (emojiRegex.test(answer)) {
            violations.push('Contains emojis');
        }

        return violations;
    }

    /**
     * Sanitize response by removing forbidden content
     */
    sanitize(answer) {
        let sanitized = answer;

        // Remove "as an AI" phrases
        sanitized = sanitized.replace(/as an? (ai|artificial intelligence|language model)[^.]*\./gi, '');

        // Remove emojis
        sanitized = sanitized.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');

        return sanitized.trim();
    }

    /**
     * Parse JSON response from AI, handling markdown code blocks
     */
    parseAIResponse(rawResponse) {
        let jsonStr = rawResponse.trim();

        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }

        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            // If parsing fails, construct a minimal valid response
            return {
                persona: null,
                answer: rawResponse,
                confidence: 0.0,
                source: [],
                notes: 'Failed to parse structured response'
            };
        }
    }
}

module.exports = new ResponseValidator();
