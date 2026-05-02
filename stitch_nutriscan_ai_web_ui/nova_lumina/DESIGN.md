# Design System Specification: The Nova Framework

## 1. Overview & Creative North Star: "The Clinical Ethereal"
The North Star for this design system is **The Clinical Ethereal**. We are moving away from the "gym-bro" aesthetic of high-contrast blacks and neon yellows. Instead, we are positioning the interface as a high-end medical concierge from the future. 

To achieve this, the system breaks the "standard grid" through **intentional layering and depth**. We do not place elements *next* to each other; we stack them like sheets of precision-cut glass. By utilizing tight typography tracking against expansive white space, we create an editorial feel that suggests both scientific authority and technological lightness.

---

## 2. Color & Surface Architecture

### The Palette
The color system is anchored in `primary` (#00694b) and `secondary` (#266658), representing growth and clinical precision. The `surface` tokens provide the "air" the system needs to breathe.

*   **Primary (Emerald):** `#00694b` — Used for high-intent actions and brand moments.
*   **Surface (Base):** `#f5f7f8` — The canvas for the entire experience.

### The "No-Line" Rule
Traditional 1px borders are strictly prohibited for sectioning. Structural definition must be achieved through:
1.  **Background Shifts:** Placing a `surface-container-lowest` card on a `surface-container-low` background.
2.  **Tonal Transitions:** Using the `surface-dim` token to create soft gutters between content blocks.

### The Glass & Gradient Rule
To elevate the UI beyond a flat template, use **Glassmorphism** for floating headers and overlay modals.
*   **Formula:** `surface-container-lowest` at 60% opacity + `backdrop-blur(24px)`.
*   **Signature Mesh:** Backgrounds should never be flat. Combine `surface` with animated radial gradients of `primary_fixed` (#8cfece) at 10% opacity to create a "living" environment.

---

## 3. Typography: Editorial Authority
The type system pairs the geometric precision of **Manrope** for headlines with the functional clarity of **Inter** for data.

*   **The Power Lockup:** `display-lg` (Manrope) headings must use `letter-spacing: -0.04em`. This tight tracking creates a "branded" editorial look found in premium magazines.
*   **Body & Labels:** `body-md` (Inter) is our workhorse. Ensure `on-surface-variant` is used for secondary data to maintain the "Clinical Curator" hierarchy.
*   **Scale Highlights:**
    *   **Display LG:** 3.5rem / Manrope / Bold / -4% Tracking.
    *   **Headline MD:** 1.75rem / Manrope / Semibold / -2% Tracking.
    *   **Label MD:** 0.75rem / Inter / Medium / +2% Tracking (Uppercase for status chips).

---

## 4. Elevation & Depth: The Layering Principle

### Tonal Layering
Depth is a functional tool, not a decoration. We follow a strict nesting hierarchy:
*   **Level 0 (Base):** `surface`
*   **Level 1 (Section):** `surface-container-low`
*   **Level 2 (Card):** `surface-container-lowest` (#ffffff)

### Ambient Shadows
When an element must float (e.g., a primary FAB or a diagnostic modal), use a "Nova Shadow":
*   **Shadow Specs:** `0px 24px 48px rgba(0, 77, 54, 0.08)`
*   **Note:** Use a tinted shadow (derived from `on-primary-fixed`) rather than pure black to maintain the emerald-glass aesthetic.

### The Ghost Border
For accessibility on glass surfaces, use a **Ghost Border**: `outline-variant` at 15% opacity. This provides a "lip" to the glass without breaking the ethereal flow.

---

## 5. Components

### Buttons: The "Glow" State
*   **Primary:** Uses `primary`. On hover, apply a box-shadow glow using `primary_container` and a `scale(1.02)` transform.
*   **Secondary:** Glass-based. `surface-container-lowest` at 40% opacity with a `Ghost Border`.

### Cards: The Science Vessel
Forbid the use of dividers. Use `xl` (1.5rem) corner radius.
*   **Layout:** Content should be padded with `spacing-lg` (1.5rem) to ensure the AI-generated data feels curated, not cluttered.
*   **Interaction:** On hover, cards should transition from `surface-container-low` to `surface-container-lowest` with a subtle shimmer effect.

### Input Fields: Minimalist Precision
*   **Style:** No background fill. Only a bottom-border using `outline-variant` at 30%. 
*   **Focus State:** The border transitions to `primary` with a 2px thickness and a subtle `primary_fixed` outer glow.

### Additional Signature Components
*   **The Scan-Line Loader:** Instead of a spinner, use a horizontal shimmer line that traverses the top of cards using a `primary` to `transparent` gradient.
*   **Bio-Metrics Chips:** Use `secondary_container` with `on-secondary-container` text. These should have a `full` (9999px) pill radius to contrast against the architectural cards.

---

## 6. Do’s and Don’ts

### Do:
*   **Use Asymmetry:** Offset your hero imagery or data visualizations to create a "custom-coded" look.
*   **Embrace White Space:** If a section feels crowded, increase the vertical margin by 24px.
*   **Animate Transitions:** Every state change should have a 300ms "Ease-Out-Expo" curve.

### Don’t:
*   **Don't use pure black (#000000):** Use `inverse_surface` for dark modes and `on-surface` for text to keep the palette organic.
*   **Don't use 1px solid dividers:** If you need to separate content, use a 16px gap or a subtle color shift to `surface-variant`.
*   **Don't crowd the glass:** Glassmorphism fails when too much text is placed over a complex background. Keep glass surfaces reserved for high-level summaries.