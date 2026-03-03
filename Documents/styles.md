# src/index.css — Component Styles Reference

## Overview

Tailwind CSS handles most of the styling in Vocably through utility classes applied directly in JSX. But some patterns repeat across many components — the same font size, color, flex layout, and transition — in ways that make direct utility application noisy. `src/index.css` extracts those repeated patterns into named component classes.

The file has three parts:

1. **`@import "tailwindcss"`** — Boots the entire Tailwind v4 framework from one CSS line.
2. **`@theme { }`** — Extends the spacing scale with custom sizes Tailwind doesn't include by default.
3. **`@layer components { }`** — Defines reusable component classes that Tailwind utilities can still override.

---

## Common Confusions

### Why define classes here instead of just using Tailwind utilities in JSX?

Tailwind utilities are the right choice for one-off styles. But when the same combination of 6–8 utilities appears on 10 different elements, it becomes fragile — a change to the pattern requires hunting down every instance. Classes like `.nav-link` or `.text-label` give that pattern a single source of truth.

### Why `@layer components`?

Anything defined inside `@layer components` sits at a lower cascade priority than Tailwind's utility classes. That means you can always override a component class with a utility. For example, `.text-heading` sets `color: neutral-800`, but adding `text-neutral-500` on the element in JSX will win. Without `@layer`, your custom class and Tailwind utilities would fight for priority based on source order, which is unpredictable.

### Why does the show/hide pattern need three properties — opacity, visibility, and pointer-events?

- `opacity: 0` alone makes the panel invisible but leaves it fully interactive. Users can click invisible buttons.
- `visibility: hidden` alone hides it from screen readers and focus order, but cannot be transitioned — it snaps instantly with no animation.
- `display: none` cannot be animated at all.
- The three-property combination — `opacity` for the visual fade, `visibility` for the accessibility tree, `pointer-events: none` for click blocking — is the only approach that gets all three behaviors while still allowing a smooth CSS transition.

---

## Custom Spacing — `@theme`

```css
@theme {
  --spacing-100: 25rem;
  --spacing-150: 37.5rem;
  --spacing-187-5: 46.875rem;
}
```

**What it does:** Registers three custom sizes into Tailwind's spacing system. Once declared, they behave exactly like any built-in Tailwind spacing value — `w-100`, `min-w-150`, `gap-187.5`, etc.

**Why it matters:** Tailwind's default scale jumps from `w-96` (24rem / 384px) and has no values for 400px, 600px, or 750px. The Hero card and Navbar flyout panels need those specific widths. Rather than writing arbitrary inline styles (`style={{ minWidth: '600px' }}`), these tokens keep the widths inside Tailwind's system where they're consistent and easy to change.

| Token | Value | Used for |
| --- | --- | --- |
| `--spacing-100` | 25rem / 400px | Minimum widths in flyout panels |
| `--spacing-150` | 37.5rem / 600px | Wider flyout panel widths |
| `--spacing-187-5` | 46.875rem / 750px | Widest layout containers |

---

## Component Classes

---

### `.card-feature`
**Used in:** `Hero.jsx`

```css
.card-feature {
  display: flex;
  flex-direction: column;
  border-radius: 0.75rem;
  padding: 0.75rem;
  transition: background-color 0.2s;
  cursor: pointer;
}
```

**What it does:** Sets up the base layout and interaction styles for the feature cards in the Hero section — column flex, rounded corners, inner padding, and a pointer cursor.

**Why it matters:** The `transition: background-color 0.2s` is the key line. Background color is not set here — callers apply it via Tailwind on the element itself (e.g., `hover:bg-neutral-50`). Because the transition is already declared on the base class, the hover color change automatically animates. If the transition were missing, the background would snap instantly.

---

### `.nav-link`
**Used in:** `Navbar.jsx`

```css
.nav-link {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.025em;
  color: var(--color-neutral-600);
  transition: color 0.2s;
  text-decoration: none;
}

.nav-link:hover {
  color: var(--color-neutral-900);
}
```

**What it does:** Styles the top-level navbar links — uppercase, medium weight, small size, with a 0.2s color transition on hover.

**Why it matters:** `text-decoration: none` is explicitly set because anchor tags (`<a>`) have browser-default underlines. The uppercase + letter-spacing combination is the same typographic treatment used by `.text-label`, keeping the navbar visually consistent with the label system in the rest of the UI.

---

### `.text-label`
**Used in:** `Hero.jsx`, `DropupSelector.jsx`

```css
.text-label {
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
  color: var(--color-neutral-400);
}
```

**What it does:** Renders small uppercase eyebrow labels — the kind placed above a heading to provide a category or group name.

**Why it matters:** `neutral-400` is intentionally lighter than body text (`neutral-600`–`neutral-800`). It signals secondary hierarchy — present for context, not primary content. If this were the same color as the heading below it, it would compete visually rather than introduce it.

---

### `.text-heading`
**Used in:** `Hero.jsx`, `DropupSelector.jsx`

```css
.text-heading {
  font-weight: 600;
  color: var(--color-neutral-800);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}
```

**What it does:** Styles a section heading. The flex layout and `gap` are built in.

**Why it matters:** Most headings in Vocably are paired with a Remix Icon — `<i className="ri-mic-line" /> Voice Synthesis`. Without `display: flex` and `align-items: center`, the icon and text sit on the baseline, which causes the icon to appear lower than the text cap height. The gap prevents them from touching. Since this pattern appears on every feature card and selector label, centralizing it here means the alignment is correct everywhere without any extra work at the call site.

---

### `.icon-circle`
**Used in:** `Hero.jsx`

```css
.icon-circle {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9999px;
}
```

**What it does:** Creates a centered circular container for icon badges.

**Why it matters:** `border-radius: 9999px` is larger than any element will ever be, which guarantees fully circular corners regardless of the element's size. Size, color, and background are not set here — they're applied by the caller via Tailwind (`w-8 h-8 bg-neutral-100 text-neutral-500`, etc.), keeping this class reusable across different-sized icon badges.

---

### Dropdown — `.dropdown-panel` / `.dropdown-hidden` / `.dropdown-visible`
**Used in:** `DropupSelector.jsx`

```css
.dropdown-panel {
  position: absolute;
  background-color: white;
  border-radius: 0.75rem;
  box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
  border: 1px solid var(--color-neutral-200);
  overflow: hidden;
  z-index: 50;
  transition: opacity 0.2s ease-out, transform 0.2s ease-out, visibility 0.2s;
}
```

**What it does:** Styles the dropdown panel container — white background, shadow, rounded corners, `z-index: 50` to float above the page.

**Why `overflow: hidden` is required:** The panel has `border-radius: 0.75rem`. Without `overflow: hidden`, child elements (buttons, list items) render outside the rounded corners at the top and bottom edges. `overflow: hidden` clips everything inside to the boundary.

```css
.dropdown-hidden {
  opacity: 0;
  transform: translateY(0.5rem);
  visibility: hidden;
  pointer-events: none;
}

.dropdown-visible {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
  pointer-events: auto;
}
```

**What it does:** Toggle between `.dropdown-hidden` and `.dropdown-visible` to show or hide the panel with an animated fade and 8px slide.

**Why three properties:** See [Common Confusions](#common-confusions) above. `opacity` fades it, `visibility` removes it from keyboard/screen reader access, `pointer-events: none` prevents invisible clicks. All three are needed.

---

### `.feature-card-desc`
**Used in:** `Hero.jsx`

```css
.feature-card-desc {
  font-size: 0.75rem;
  line-height: 1rem;
  color: var(--color-neutral-500);
  margin-bottom: 0.5rem;
}
```

**What it does:** Styles the one-line description text inside a feature card — slightly lighter (`neutral-500`) than the heading above it to maintain content hierarchy.

---

### `.feature-card-list` / `.feature-card-list > div`
**Used in:** `Hero.jsx`

```css
.feature-card-list {
  font-size: 0.625rem;
  line-height: 1.4;
  color: var(--color-neutral-600);
}

.feature-card-list > div {
  margin-bottom: 0.125rem;
}
```

**What it does:** Styles the fine-print bullet text at the bottom of feature cards (10px). The `> div` rule adds 2px spacing between each item.

**What to watch:** The `>` is a direct child combinator. Only immediate `div` children get the spacing. If you wrap items in another element or use `span`, the spacing rule won't apply. The HTML structure must be direct `div` children of the `.feature-card-list` element.

---

### `.animate-fade-in-up`
**Used in:** `Hero.jsx`

```css
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.animate-fade-in-up {
  animation: fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  opacity: 0;
}
```

**What it does:** Plays an entrance animation — the element starts 20px below its final position at zero opacity, and transitions to full opacity at its natural position over 0.6s.

**Why `opacity: 0` is on the class itself:** The `from` keyframe sets `opacity: 0`, but keyframes only apply once the animation starts. Between the moment the element is added to the DOM and the moment the browser fires the animation, there is a window — sometimes a full frame — where the element is visible at `opacity: 1` before the animation kicks in. The `opacity: 0` on the class declaration covers that window, preventing the flash.

**Why this easing curve:** `cubic-bezier(0.16, 1, 0.3, 1)` is a spring ease-out — very fast at the start, then decelerates sharply. It feels natural for entrance animations because objects in the real world don't move at a constant speed; they accelerate into motion and slow down as they arrive.

---

### `.key-active-pop`
**Used in:** `Hero.jsx`

```css
@keyframes popIn {
  0%   { transform: scale(0); }
  100% { transform: scale(1); }
}

.key-active-pop {
  animation: popIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}
```

**What it does:** Scales an element in from zero over 0.2s, with a slight bounce at the end. Used for keyboard shortcut key badges in the Hero.

**Why the bounce:** The easing curve `cubic-bezier(0.175, 0.885, 0.32, 1.275)` has a control point that exceeds `1.0`. In a scale animation, that means the element briefly scales past its final size (slightly larger than 1) before snapping back. This is called overshoot, and it gives small UI elements like badges a tactile, physical feel.

---

### Flyout — `.flyout-container` / `.flyout-hidden` / `.flyout-visible`
**Used in:** `FlyoutLink.jsx`

```css
.flyout-container {
  transition: opacity 0.2s ease-out, transform 0.2s ease-out, visibility 0.2s;
}

.flyout-hidden {
  opacity: 0;
  transform: translateY(15px);
  visibility: hidden;
  pointer-events: none;
}

.flyout-visible {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
  pointer-events: auto;
}
```

**What it does:** Same three-property show/hide pattern as the dropdown. Toggle `.flyout-hidden` / `.flyout-visible` on the container to animate the navbar hover dropdown panels.

**Why the transition is on `.flyout-container` and not on the inner panel:** The flyout's inner panel element carries its own layout, positioning, and styling. Mixing transition declarations into that element creates specificity conflicts. Keeping the transition on a dedicated wrapper class separates concerns — the container handles animation, the inner panel handles appearance.

**Why 15px instead of 8px (`0.5rem`):** The flyout panels are physically larger than the DropupSelector dropdown. A larger element traveling a shorter distance can look like it barely moved. 15px provides the same perceived animation intensity for a bigger element.

---

### Accordion — `.accordion-grid` / `.accordion-grid.open` / `.accordion-inner`
**Used in:** `Navbar.jsx` (mobile menu)

```css
.accordion-grid {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease-out;
}

.accordion-grid.open {
  grid-template-rows: 1fr;
}

.accordion-inner {
  overflow: hidden;
}
```

**What it does:** Collapses and expands content by animating `grid-template-rows` between `0fr` and `1fr`. Add the `open` class to expand, remove it to collapse.

**Why this works where `max-height` doesn't:** The classic accordion hack animates `max-height` from `0` to some large value like `1000px`. The problem is that the easing curve applies over the full `0–1000px` range, not just the actual content height. If the content is 200px tall, the animation finishes almost instantly and the remaining 800px of the transition runs invisibly — making the easing feel broken. The CSS Grid approach animates exactly between collapsed and natural height, so the easing curve applies to the real distance.

**Why `.accordion-inner` needs `overflow: hidden`:** When `grid-template-rows` is `0fr`, the row height is zero, but CSS does not automatically clip the content. Without `overflow: hidden` on the inner element, all the content overflows out of the collapsed row and stays visible on the page. `overflow: hidden` forces the content to stay inside the row's boundaries.

---

### `.use-case-badge`
**Used in:** `Hero.jsx`

```css
.use-case-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background-color: white;
  border: 1px solid var(--color-neutral-200);
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-neutral-600);
  transition: all 0.2s;
}

.use-case-badge:hover {
  border-color: var(--color-neutral-300);
  color: var(--color-neutral-800);
  transform: translateY(-1px);
}
```

**What it does:** Styles the pill badges labeling use cases in the Hero section (e.g., "Audiobooks", "Podcasts"). On hover, the border darkens and the badge lifts 1px.

**Why a 1px lift instead of a background change:** These badges are informational labels, not primary action buttons. A background color change would signal "this is clickable and does something important." A subtle lift acknowledges the interaction without overstating the element's importance.

---

### `.example-pill` / `.example-pill-active`
**Used in:** `Hero.jsx`

```css
.example-pill {
  /* inline-flex pill with neutral-50 background */
  background-color: var(--color-neutral-50);
  border: 1px solid var(--color-neutral-200);
  border-radius: 9999px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.example-pill:hover {
  border-color: var(--color-purple-300);
  background-color: var(--color-purple-50);
  color: var(--color-purple-700);
}

.example-pill-active {
  border-color: var(--color-purple-400);
  background-color: var(--color-purple-100);
  color: var(--color-purple-700);
}
```

**What it does:** Styles the selector pills for the example text snippets in the Hero. The active pill — whichever example is currently loaded in the text area — gets `.example-pill-active` applied via JavaScript.

**How the three states differ:**

| State | Border | Background | Meaning |
| --- | --- | --- | --- |
| Default | `neutral-200` | `neutral-50` | Not selected, not interacted with |
| Hover | `purple-300` | `purple-50` | Mouse is over it |
| Active | `purple-400` | `purple-100` | Currently selected |

Active uses a more saturated purple (`400` border, `100` background) than hover (`300`/`50`). This keeps hover and active visually distinct — if they looked the same, you couldn't tell whether a pill was selected or just being hovered.

---

## Class–Component Map

| Class | Component |
| --- | --- |
| `.card-feature` | `Hero.jsx` |
| `.nav-link` | `Navbar.jsx` |
| `.text-label`, `.text-heading` | `Hero.jsx`, `DropupSelector.jsx` |
| `.icon-circle` | `Hero.jsx` |
| `.dropdown-panel`, `.dropdown-hidden`, `.dropdown-visible` | `DropupSelector.jsx` |
| `.feature-card-desc`, `.feature-card-list` | `Hero.jsx` |
| `.animate-fade-in-up`, `.key-active-pop` | `Hero.jsx` |
| `.flyout-container`, `.flyout-hidden`, `.flyout-visible` | `FlyoutLink.jsx` |
| `.accordion-grid`, `.accordion-inner` | `Navbar.jsx` |
| `.use-case-badge`, `.example-pill`, `.example-pill-active` | `Hero.jsx` |
