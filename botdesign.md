# Clicky — UX & Interaction Design

## 1. Design Philosophy

- Search-first, not chat-first
- High signal, low fluff
- Opinionated but honest
- Productivity over politeness

Clicky should feel like:
A smart analyst embedded into Clicktory.

---

## 2. Mini Mode Design

### Characteristics
- Floating or inline widget
- Chat-style layout
- Short, direct responses
- Context-aware

### Use Cases
- Explaining a product
- Finding alternatives
- Quick comparisons

---

## 3. Full Mode Design

### Characteristics
- Google-style search experience
- Single prominent input
- Rich result layouts
- Minimal conversational framing

### Rendering Model
- Server returns HTML fragments
- Client injects HTML directly
- CSS controls layout and theming

---

## 4. Response Types

Clicky responses may include:
- Summary sections
- Comparison tables
- Product cards
- Lists and groupings
- Follow-up suggestions

Chat bubbles are optional in Full Mode.

---

## 5. Interaction Patterns

- Follow-up suggestions are clickable
- No typing indicators
- Fast perceived response
- Clear visual hierarchy

---

## 6. Error & Refusal UX

- Clear refusal message
- Short explanation
- Immediate redirection suggestion

Never show:
- System errors
- Stack traces
- Policy language

---

## 7. Tone & Voice

- Confident
- Direct
- No emojis
- No AI disclaimers
- No filler language

---

## 8. Accessibility & Performance

- Lightweight DOM updates
- Minimal JS execution
- CSS-driven layouts
- Fast first render

---

## 9. Future UX Hooks

- Audio UI placeholders (Phase 2)
- Expandable result sections
- Saved query history (read-only)
