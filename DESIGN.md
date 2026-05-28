---
version: alpha
name: Letmefree
description: "A voice-first coaching product for commuting leaders. The visual system should feel quiet, premium, warm, and conversational: ElevenLabs-like voice atmosphere, Notion-like reflective workspace softness, and Superhuman-like productivity discipline. Letmefree must not feel like a cyber game, generic AI dashboard, therapy app, or neon simulator. It is a calm leadership-grade space where selfness and weness conversations can happen without AI uncanny friction."
colors:
  ink: "#191512"
  ink-soft: "#3D362F"
  ink-muted: "#746B63"
  ink-faint: "#A59C92"
  canvas: "#F6F1EA"
  canvas-soft: "#FBF8F3"
  canvas-warm: "#EFE6DA"
  surface: "#FFFFFF"
  surface-soft: "#F9F5EF"
  surface-elevated: "#FFFDFC"
  hairline: "#E7DED3"
  hairline-strong: "#D6C9BA"
  primary: "#1C423B"
  primary-active: "#12302B"
  on-primary: "#FFFFFF"
  selfness-peach: "#F2C6AB"
  selfness-rose: "#E9B8C4"
  selfness-lavender: "#CDBDE8"
  weness-mint: "#B9E3D4"
  weness-sky: "#B8D6EA"
  weness-teal: "#78B8AA"
  attention-amber: "#C9822B"
  semantic-success: "#2F7D5C"
  semantic-warning: "#C9822B"
  semantic-error: "#B84A3D"
  dark-band: "#111C1A"
  on-dark: "#FFFDFC"
  on-dark-soft: "#C8D2CE"
typography:
  display-xl:
    fontFamily: "'Fraunces', 'Noto Serif KR', 'Times New Roman', serif"
    fontSize: 64px
    fontWeight: 500
    lineHeight: 1.03
    letterSpacing: "-0.04em"
  display-lg:
    fontFamily: "'Fraunces', 'Noto Serif KR', 'Times New Roman', serif"
    fontSize: 48px
    fontWeight: 500
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  display-md:
    fontFamily: "'Fraunces', 'Noto Serif KR', 'Times New Roman', serif"
    fontSize: 36px
    fontWeight: 500
    lineHeight: 1.14
    letterSpacing: "-0.025em"
  title-lg:
    fontFamily: "'Inter', 'Noto Sans KR', system-ui, sans-serif"
    fontSize: 24px
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.015em"
  title-md:
    fontFamily: "'Inter', 'Noto Sans KR', system-ui, sans-serif"
    fontSize: 20px
    fontWeight: 650
    lineHeight: 1.35
    letterSpacing: "-0.01em"
  body-lg:
    fontFamily: "'Inter', 'Noto Sans KR', system-ui, sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "-0.005em"
  body-md:
    fontFamily: "'Inter', 'Noto Sans KR', system-ui, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.58
    letterSpacing: "-0.003em"
  body-sm:
    fontFamily: "'Inter', 'Noto Sans KR', system-ui, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "0em"
  caption:
    fontFamily: "'Inter', 'Noto Sans KR', system-ui, sans-serif"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.08em"
  button:
    fontFamily: "'Inter', 'Noto Sans KR', system-ui, sans-serif"
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.005em"
rounded:
  sm: 8px
  md: 12px
  lg: 18px
  xl: 24px
  xxl: 32px
  pill: 9999px
spacing:
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 14px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 14px
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.pill}"
    padding: 14px
  card-surface:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
  card-soft:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: 24px
  voice-orb-selfness:
    backgroundColor: "{colors.selfness-peach}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xxl}"
    padding: 32px
  voice-orb-weness:
    backgroundColor: "{colors.weness-mint}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xxl}"
    padding: 32px
  input-transcript:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 16px
  badge-pill:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink-muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 8px
---

## Overview

Letmefree is a voice-first coaching product for commuting leaders. Its visual identity must support immersion before decoration: a leader should feel like they entered a calm, private, premium conversation space rather than a chatbot, game, or generic productivity dashboard.

The product promise is `자기다움` and `우리다움`. The design therefore needs two emotional registers:

- **Selfness:** reflective, warm, personal, and spacious.
- **Weness:** clear, relational, practical, and team-oriented.

The strongest references are:

1. **ElevenLabs** for voice atmosphere, soft editorial pacing, pill CTAs, and restrained color.
2. **Notion** for warm reflective workspace surfaces and organized knowledge cards.
3. **Superhuman** for premium productivity discipline and dense-but-elegant information hierarchy.

Letmefree should feel Korean-readable, leadership-grade, and low-stimulation enough for a commute context. It must not feel like a cyberpunk simulator, RPG UI, AI toy, therapy cliché, or neon SaaS dashboard.

## Colors

The base palette is warm and quiet. Use `canvas`, `canvas-soft`, and `surface` as the dominant colors. Use `ink` for core text and `primary` as the only high-emphasis CTA color.

### Color Roles

- **Canvas (`#F6F1EA`):** warm off-white page floor. This is the default background for voice/coaching surfaces.
- **Ink (`#191512`):** warm near-black for main copy and high trust.
- **Primary (`#1C423B`):** deep teal, used for one primary action per screen.
- **Selfness accents:** peach, rose, and lavender. Use as atmospheric orbs, subtle chips, and reflection cards.
- **Weness accents:** mint, sky, and teal. Use as team/practice atmospheres and relational cards.
- **Dark band (`#111C1A`):** rare, premium contrast sections only. Do not turn the whole app into a dark cyber UI.

### Avoid

- Neon cyan as the primary brand signal.
- Game gold as a core CTA.
- Multi-color gradients that look like an AI demo.
- Red/green semantic colors except for real validation states.

## Typography

Letmefree uses an editorial display voice and a highly readable Korean body system.

- **Display:** `Fraunces` plus `Noto Serif KR` fallback. Use for hero headlines and emotional section titles.
- **Body/UI:** `Inter` plus `Noto Sans KR`. Use for transcript, cards, controls, and analysis.
- Display copy should feel calm and human, not loud. Never use heavy all-caps game typography for coaching surfaces.
- Korean readability wins over western brand resemblance. If a serif display harms Korean legibility, prefer `Noto Sans KR` with careful weight and spacing.

## Layout

Use generous editorial rhythm, but keep mobile-first practicality.

- Page max width: 1180px.
- Section rhythm: 96px desktop, 48px mobile.
- Voice sessions use a two-column desktop layout: transcript/input on the left, session/result flow on the right.
- Mobile collapses to one column with the active coaching content first.
- Cards should have breathing room. Avoid dense grids unless the user is browsing saved sessions or history.

The hierarchy should be:

1. One emotional headline.
2. One short explanatory sentence.
3. One clear primary action.
4. A small number of result/practice cards.

## Elevation & Depth

Letmefree uses quiet depth: hairlines, soft shadows, and atmospheric orbs.

- Default cards: 1px warm hairline plus subtle shadow.
- Use soft radial orbs for voice atmosphere, never as button fills.
- Avoid neon glow shadows except in legacy game/simulation screens.
- Do not use hard glassmorphism or excessive blur on coaching surfaces.

Recommended shadows:

- Card: `0 18px 48px rgba(45, 35, 25, 0.08)`
- Floating voice panel: `0 28px 80px rgba(28, 66, 59, 0.16)`
- No cyber glow.

## Shapes

Use rounded, tactile shapes that feel conversational.

- CTAs and chips: pill.
- Cards: 24px radius.
- Large voice atmosphere panels: 32px radius.
- Inputs: 18px radius.

Avoid sharp terminal blocks and game HUD corners in the Letmefree voice-first flow.

## Components

### Voice Hero

A voice hero contains a short emotional headline, one subcopy sentence, one primary CTA, one secondary low-emphasis option, and a subtle atmospheric orb. It should feel like an invitation to speak, not a dashboard command center.

### Transcript Input

The transcript input should look like a private note surface. It uses `surface`, `ink`, `rounded.lg`, and a warm hairline. Placeholder copy should be human and specific.

### Experience Card

The experience card shows family, mode, title, and one first question. It should use a large rounded card, a small badge, and a soft selfness/weness accent. Never overload it with more than one recommended primary action.

### Session Step Card

Each session step card contains:

- one small label,
- one human-readable title,
- one concise paragraph or bullet group.

For a voice-first flow, every card should be glanceable. Do not create long walls of text.

### Analysis / Action / Reminder Result

The result module is a three-part structure:

1. Analysis readout, maximum three points.
2. Action item, one to three items.
3. Reminder, with safety copy such as `운전이 끝난 뒤`.

### Buttons

Use one high-emphasis primary button per screen. Secondary buttons should be outlined, white, or text-style. Avoid multiple competing CTA colors.

## Do's and Don'ts

### Do

- Make the product feel calm, private, premium, and human.
- Use warm surfaces and near-black ink.
- Use selfness/weness accent colors softly and semantically.
- Preserve Korean readability.
- Keep voice-first content short, focused, and low-stimulation.
- Use large cards with real breathing room.
- Make the next action obvious.

### Don't

- Do not use cyberpunk neon as the dominant brand language.
- Do not make coaching screens look like an RPG quest board.
- Do not use generic AI dashboard gradients.
- Do not make the user read dense content while supposedly driving.
- Do not use `AI로서`, robot-like helper copy, or technical jargon in user-facing coaching moments.
- Do not add decorative complexity that harms trust.

## Responsive Behavior

- Mobile is the primary product surface.
- Minimum touch target: 44px.
- Primary CTA stays visible near the top of the flow.
- Session cards stack vertically on mobile.
- Avoid side-by-side comparison tables on mobile.
- Keep transcript input and result cards readable at 360px width.

## Agent Prompt Guide

When editing Letmefree UI, use this prompt internally:

> Design this as a quiet premium voice-first coaching experience for commuting leaders. Use warm off-white surfaces, near-black ink, deep teal primary CTA, and soft selfness/weness atmospheric accents. Avoid cyber neon, game UI, generic AI gradients, and dashboard clutter. Prioritize Korean readability, one clear action, and human conversational warmth.

For `/voice-coach`, prefer:

- warm canvas background,
- soft voice orb behind the hero,
- one primary pill CTA,
- selfness/weness accent chips,
- result cards with analysis/action/reminder,
- no neon glow.
