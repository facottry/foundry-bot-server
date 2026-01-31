# Clicky — Product Requirements Document (PRD)

## 1. Product Overview

Clicky is an internal, login-gated, AI-powered search and QnA interface for Clicktory.
It enables users to discover, compare, and understand products and founders using
public Clicktory data, augmented with AI reasoning.

Clicky is not a SaaS chatbot.
Clicky is not anonymous.
Clicky is strictly read-only.

---

## 2. Goals

### Primary Goals
- Reduce time to discover relevant products
- Enable high-quality comparisons and explanations
- Provide a search-first AI experience
- Improve decision-making speed for logged-in users

### Secondary Goals
- Offer rich, server-driven UI results
- Maintain strong abuse and prompt-injection resistance
- Keep frontend SDK lightweight and framework-agnostic

---

## 3. Non-Goals (Explicit)

- No anonymous access
- No write or mutation operations
- No admin-only or private data exposure
- No SaaS monetization features
- No audio or voice (Phase 1)

---

## 4. Target Users

- Logged-in Clicktory users
- Product builders
- Founders
- Researchers

All users see the same public data.

---

## 5. Core User Capabilities

Users can:
- Search for products, founders, and categories
- Compare tools and platforms
- Ask analytical and exploratory questions
- View structured results (cards, tables, comparisons)
- Ask follow-up questions suggested by Clicky

Users cannot:
- Submit data
- Edit content
- Trigger actions
- Access internal systems

---

## 6. UI Modes

### Mini Mode
- Chat-style interface
- Context-aware (current page/product)
- Fast, concise answers

### Full Mode
- Search-first experience
- Server-rendered HTML results
- Rich layouts (cards, tables, sections)
- Minimal chat feel

---

## 7. Success Metrics

- Time-to-answer
- Query completion rate
- Follow-up query usage
- Zero data leakage incidents
- Zero unauthorized access incidents

---

## 8. Phase Roadmap

### Phase 1
- Text-only
- Public data only
- Login-gated
- Read-only

### Phase 2 (Future)
- Audio input/output
- Same backend intelligence
