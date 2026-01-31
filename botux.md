# Clicky — UX Specification (botux.md)

## 1. UX North Star

Clicky must feel like:
- A powerful search engine
- A confident product analyst
- Embedded directly inside Clicktory

Clicky must NOT feel like:
- A friendly chatbot
- A conversational toy
- A helpdesk assistant

Primary UX goal:
👉 Get users to useful answers with the fewest cognitive steps.

---

## 2. Entry Conditions

- Clicky is ONLY available after login
- Clicky is NEVER visible on public or anonymous pages
- SDK is lazy-loaded post-login
- No loading screens unless unavoidable

If user is logged out:
- Clicky does not exist in DOM

---

## 3. UX Modes

### 3.1 Mini Mode (Assistive UX)

**Purpose**
- Fast help while browsing
- Low interruption
- Context-aware

**Placement**
- Floating bottom-right OR inline panel
- Does not block main content

**UI Structure**
- Compact header: “Ask Clicky”
- Scrollable response area
- Single-line input
- Enter to submit

**Behavior**
- Short answers by default
- No large layouts
- Minimal HTML rendering
- Suggestions appear as small chips

**When to use**
- Product pages
- Founder pages
- Category listings

---

### 3.2 Full Mode (Primary UX)

**Purpose**
- Discovery
- Research
- Comparison
- Decision-making

This is the **main Clicky experience**.

---

## 4. Full Mode Layout

### 4.1 Above the Fold

- Large centered search input
- Placeholder text:
  “Search products, founders, or ask a question”

- No chat bubbles initially
- No history shown by default

---

### 4.2 Results Area

Results are rendered **top-down**, not conversationally.

Typical structure:
1. Summary block
2. Structured results
3. Supporting explanations
4. Follow-up suggestions

---

## 5. Server-Driven Rendering (Critical)

### Rule
The server decides **what UI appears**.

- Server returns HTML fragments
- Client injects HTML as-is
- Client never reconstructs layout logic

This enables:
- Cards
- Tables
- Comparison grids
- Ranked lists
- Highlighted insights

Client responsibility:
- Render
- Style
- Handle interactions

---

## 6. Response Types & UX Patterns

### 6.1 Summary Block

- Appears at top
- 2–4 lines max
- Clear, opinionated language
- Sets context immediately

---

### 6.2 Structured Content

Possible formats:
- Product cards
- Comparison tables
- Bullet lists
- Grouped sections

Visual priority:
- Scan-friendly
- Clear hierarchy
- Minimal decoration

---

### 6.3 Follow-up Suggestions

- Rendered as clickable chips or links
- Appear at bottom of result
- Trigger new query on click
- No typing required

Examples:
- “Show cheaper alternatives”
- “Explain pricing differences”
- “Compare with similar tools”

---

## 7. Interaction Rules

- No typing indicators
- No “Clicky is thinking…” messages
- Responses appear as soon as ready
- UI should feel instant, even if backend takes time

If response takes longer:
- Subtle loading skeleton
- Never block input

---

## 8. Error & Refusal UX

### Refusal Pattern
1. Clear refusal message
2. One-line reason
3. Immediate safe alternative

Example:
> “That information isn’t publicly available.  
> I can explain how this category typically works instead.”

Never show:
- System errors
- Stack traces
- Policy explanations

---

## 9. Tone Enforcement (UX + Copy)

- Direct
- Confident
- Neutral-professional
- No emojis
- No “AI assistant” phrasing

UX copy should feel:
Like a senior analyst wrote it.

---

## 10. Performance UX

- First render < 200ms (client-side)
- DOM updates should be minimal
- CSS-driven layouts preferred
- Avoid heavy JS reflows

---

## 11. Accessibility Basics

- Keyboard submit supported
- Scrollable content areas
- Readable contrast
- No tiny fonts

---

## 12. Future UX Hooks (Not Active)

- Audio input button placeholder
- Expand / collapse result sections
- Saved query recall (read-only)

Do NOT implement now.
Only design hooks.

---

## 13. UX Anti-Patterns (Explicitly Forbidden)

- Chat bubbles everywhere
- Over-friendly language
- Excessive animations
- Emoji reactions
- “As an AI…” phrasing
- Overlong explanations by default

---

## 14. UX Success Criteria

A successful Clicky UX means:
- Users type fewer queries to get answers
- Users click suggested follow-ups
- Users stay in Full Mode longer
- Clicky feels indispensable, not cute
