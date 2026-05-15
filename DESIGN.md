# DESIGN.md — CSR Platform

## Color Strategy: **Restrained**
Tinted neutrals carry 90% of the surface; **Omani gold (`#C8A44E`)** is the single connective accent (never more than ~10% of pixels). Status hues are reserved for data semantics, never decoration.

### Light theme
| Token        | Value      | Use |
|--------------|------------|-----|
| `bg`         | `#FFFDF9`  | page background (warm cream) |
| `surface`    | `#FFFFFF`  | cards, panels |
| `surface2`   | `#FAF7F0`  | nested panels, sidebar wells |
| `surface3`   | `#F5ECD0`  | callouts, gold-tinted strips |
| `border`     | `#E8E0CC`  | hairlines |
| `borderHi`   | `#D4C9AE`  | hover/active hairlines |
| `textHi`     | `#1A1A1A`  | primary text |
| `textMd`     | `#3D3A34`  | body |
| `textLo`     | `#6B6560`  | meta |
| `textDim`    | `#9A9490`  | placeholder |
| `accent`     | `#C8A44E`  | Omani gold |
| `accentSoft` | `#DFC170`  | gold hover |

### Dark theme
| Token        | Value      | Use |
|--------------|------------|-----|
| `bg`         | `#070A10`  | deep night (near-black, slight blue tint) |
| `surface`    | `#0A1525`  | cards |
| `surface2`   | `#0F1D32`  | nested |
| `surface3`   | `#142845`  | accent panels |
| `border`     | `#1A2D48`  | hairlines |
| `borderHi`   | `#243B5A`  | active hairlines |
| `textHi`     | `#FFFFFF`  | primary |
| `textMd`     | `rgba(255,255,255,0.78)` | body |
| `textLo`     | `rgba(255,255,255,0.55)` | meta |
| `textDim`    | `rgba(255,255,255,0.32)` | placeholder |
| `accent`     | `#C8A44E`  | gold (unchanged) |

### Semantic data palette (use ONLY for status / risk / data)
- `success` `#34d399` (low risk, completed)
- `warning` `#fbbf24` (medium risk, on hold)
- `danger`  `#f87171` (critical)
- `info`    `#60a5fa` (active, neutral data)
- `magenta` `#E91E63` (planning)

## Typography
Stack:
```
'Playfair Display'         -- editorial heads (rare)
'Cormorant Garamond'       -- italic financial figures
'IBM Plex Sans Arabic'     -- bilingual body
'DM Sans'                  -- product UI (default body)
'Geist Mono'               -- labels, eyebrows, timestamps
```

Scale (1.25 ratio):
| Step | Size      | Use |
|------|-----------|-----|
| `xs` | 11px      | eyebrow / mono labels (tracking 0.18em uppercase) |
| `sm` | 13px      | meta, captions |
| `md` | 15px      | body |
| `lg` | 18px      | subheads |
| `xl` | 24px      | section title (DM Sans 600) |
| `2xl`| 32px      | page title (DM Sans 700) |
| `3xl`| 44px      | hero figures (Cormorant italic 600) |
| `4xl`| clamp(3rem, 5vw, 5rem) | the one big number per screen |

Tabular numerals on every metric (`font-variant-numeric: tabular-nums`).

## Spacing scale (4px base)
`4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 56 / 80`

Vary spacing for rhythm. Never apply the same padding to every card.

## Radius scale
`6 / 10 / 14 / 20 / 28 / full` — use `14` for primary cards, `20` for hero panels, `full` for pills.

## Elevation
We do **not** use Material elevation. Two depth tools only:
1. **1px hairline border** in the brand neutral (light: `#E8E0CC`; dark: `#1A2D48`)
2. **Soft contact shadow** on hover only: `0 8px 32px -16px rgba(20,15,5,0.18)` (light) / `0 8px 32px -16px rgba(0,0,0,0.55)` (dark)

No floating cards by default. They sit on the surface.

## Motion
Single ease curve, single language:
```
EASE = cubic-bezier(0.22, 1, 0.36, 1)   /* ease-out-quart */
```
- Hero entry: `550ms` fade + `y: 24 → 0`
- Stagger children: `60ms` increment
- Hover lift: `200ms`, `y: -2px`
- Number countup: `1400ms`
- Viewport trigger: `margin: -60px`, `once: true`

Never animate `width / height / top / left`. Use `transform` and `opacity`. No bounce, no elastic.

## Layout principles
- Page max width: **1440px**, centered, with breathing room (`px-6 lg:px-10`).
- Section rhythm: `gap-y-10 lg:gap-y-16` between major bands.
- 12-column grid on desktop; collapse to single column at `<lg`.
- One visual focal point per section. The eye should never be pulled in 3 directions.
- Reject "identical card grid". Use asymmetric layouts: a 7/5 split, an 8/4 split, an inset rail, or a wide hero with a narrow companion.

## Components
### `Surface`
The new neutral panel. 1px border, optional soft contact shadow on hover. No backdrop blur. No gradient bg by default. Variants: `surface`, `surface2`, `surface3` (selects token), `bordered` (default), `inset` (no border, slight bg shift).

### `Stat`
The dashboard's metric primitive. Shape: `eyebrow label / number / delta-with-spark`.
- Number uses **Cormorant italic 600** at `3xl` for headline figures, **DM Sans 600 tabular** for inline figures.
- Delta sits in a 11px Geist Mono pill: `+12.4% MoM` with directional arrow.
- Optional 36-point sparkline beneath, 1.5px stroke, `accent` or status color.

### `Pill`
Pure status chip. 24px tall, 12px text, 1px border in the semantic color, 8% bg tint of same. Use for project status, risk level, AI agent badge.

### `RegionDot`
Mini governorate marker. 8px gold dot, pulse animation when active, hover reveals governorate name (Arabic + English).

### `AccentRail`
The signature underline. 28px wide, 2px tall, gold, sits 8px below a section title. Replaces decorative dividers.

### `AgentCapsule`
For the 3 AI agents: Financial (`#3B82F6`), Impact (`#10B981`), Risk (`#F59E0B`). Master Report uses gold. Each is a horizontal capsule with a 2px left rail in the agent color, agent name in mono uppercase, and a typewriter-revealed insight body.

## Iconography
- **react-icons/pi** (Phosphor Duotone) — keep current vocabulary
- Always 18-20px in body, 16px in pills, 24px in hero
- Color: `textMd` by default; `accent` for active state; `currentColor` inheritance for status

## Charts (Recharts)
- **Always** pass theme colors via `useTheme()`; never hardcode hex.
- Grid: 1px dashed in `border` token.
- Tooltip: `surface` bg, 1px `border`, `radius-14`, `padding-12`, mono labels.
- Series colors in priority order: `accent`, `info`, `success`, `warning`, `magenta`, `danger`.
- No legends unless multi-series and ambiguous; prefer inline labels.
- All x/y labels in Geist Mono, 11px, `textLo`.

## Bilingual / RTL
- Locale flips `dir` on `<html>`.
- Arabic uses **IBM Plex Sans Arabic** as primary; numerals stay Western unless user opts into Arabic numerals via Settings.
- Mirror padding/margin via Tailwind logical properties (`ps-*`, `pe-*`, `ms-*`, `me-*`).
- Charts do NOT mirror; text labels do.

## Absolute bans (codified)
1. `border-left` / `border-right` greater than 1px as a colored accent.
2. `background-clip: text` gradient text.
3. Glass morphism as a default style.
4. The "hero metric template" (big number, small label, repeat 4 times across).
5. Identical card grids of 4 same-size cards.
6. Em dashes in copy (use commas, colons, parentheses).
7. CSS layout property animation.
8. Pure black `#000` or pure white `#fff`.

## Cultural cues
- Governorate names render in Arabic + English on hover.
- "Ministry of Commerce & Industry, Oman" footer signature.
- Frankincense subtle warm undertone in cream — already in the palette via `#FFFDF9` and `#FAF7F0`.
- Respect Asia/Muscat timezone for all timestamps.
