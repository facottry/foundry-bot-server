/**
 * Session Manager - In-Memory LRU + TTL
 * Strict Contract Implementation
 */

class SessionManager {
    constructor() {
        // Config constants
        this.MAX_SESSIONS = 10000;
        this.TTL_MS = 30 * 60 * 1000; // 30 minutes

        // Main storage
        this.sessions = new Map(); // Key: session_id, Value: sessionObject
    }

    /**
     * Get or Create Session
     * Guaranteed to return a valid session object
     */
    getSession(sessionId) {
        if (!sessionId) throw new Error("Session ID required");

        let session = this.sessions.get(sessionId);

        // Check if exists
        if (session) {
            // Check TTL
            if (Date.now() - session.last_accessed_at > this.TTL_MS) {
                // Expired - destroy and recreate (silently)
                this._destroySession(sessionId, 'TTL_EXPIRY');
                session = null;
            } else {
                // Valid - update access time & LRU position
                this._touchSession(sessionId);
                return session;
            }
        }

        // Create new if missing or expired
        return this._createSession(sessionId);
    }

    /**
     * Update Session State
     * Strict verification of allowed fields
     */
    updateSession(sessionId, updates) {
        let session = this.sessions.get(sessionId);

        // Safety: If session missing during update, recreate it first
        if (!session) session = this._createSession(sessionId);

        // Allowed fields whitelist
        const allowed = [
            'last_user_message',
            'last_bot_reply',
            'active_persona',
            'mode',
            'last_intent',
            'soft_state'
        ];

        let changed = false;
        allowed.forEach(field => {
            if (updates[field] !== undefined) {
                session[field] = updates[field];
                changed = true;
            }
        });

        if (changed) {
            this._touchSession(sessionId);
        }

        return session;
    }

    // --- INTERNAL HELPERS ---

    _createSession(sessionId) {
        // Check capacity - Evict if needed
        if (this.sessions.size >= this.MAX_SESSIONS) {
            this._evictLRU();
        }

        const newSession = {
            id: sessionId,
            last_user_message: null,
            last_bot_reply: null,
            active_persona: null,
            mode: 'mini', // default
            last_intent: null,
            soft_state: {
                onboarding: 'PENDING',
                verification: 'NONE'
            },
            last_accessed_at: Date.now()
        };

        this.sessions.set(sessionId, newSession);
        return newSession;
    }

    _touchSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        // Update timestamp
        session.last_accessed_at = Date.now();

        // LRU Logic: Delete and Re-add to move to end (Map preserves insertion order)
        this.sessions.delete(sessionId);
        this.sessions.set(sessionId, session);
    }

    _evictLRU() {
        // Map.keys().next().value returns the first inserted item (Least Recently Used due to _touchSession logic)
        const lruId = this.sessions.keys().next().value;
        if (lruId) {
            this._destroySession(lruId, 'LRU_EVICTION');
        }
    }

    _destroySession(sessionId, reason) {
        this.sessions.delete(sessionId);
        // Logging for debug, but strict rule says "Eviction is silent" to user
        // console.log(`[SessionManager] Destroyed ${sessionId}: ${reason}`);
    }

    // Force clear (Server Restart simulation)
    resetAll() {
        this.sessions.clear();
    }
}

// Singleton instance
module.exports = new SessionManager();
