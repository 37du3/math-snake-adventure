# Math Snake Adventure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the basic Snake game into a polished "Math Snake Adventure" with multiple-choice questions, tiered progression (Bronze-Diamond), themed visuals, and power-ups.

**Architecture:** 
- **Type**: **Pure Frontend (Static Site)**.
- **Rationale**: 
    - **Hosting**: Zero-cost deployment on GitHub Pages / EdgeOne / Vercel.
    - **Complexity**: No backend required; Game logic runs entirely in browser.
    - **Persistence**: `localStorage` used for High Scores and Progress.
    - **Scalability**: Can handle unlimited traffic via CDN.
    - **Future Proofing**: Compatible with lightweight BaaS (Firebase/Supabase) if Global Leaderboards are needed later.

**Tech Stack:** HTML5, CSS3, Vanilla JavaScript.

---

## Design System (per `ui-ux-pro-max`)

### 🎨 Color Palettes (Themed)
| Tier | Theme Name | Primary | Background | Accent |
|------|------------|---------|------------|--------|
| **Base** | UI | `#F8FAFC` (Text) | `#0F172A` (Slate-900) | `#3B82F6` (Blue-500) |
| **Bronze** | 🌲 Forest | `#22C55E` (Green-500) | `#064E3B` (Emerald-900) | `#86EFAC` (Green-300) |
| **Silver** | 🌊 Ocean | `#0EA5E9` (Sky-500) | `#0C4A6E` (Sky-900) | `#7DD3FC` (Sky-300) |
| **Gold** | 🏜️ Desert | `#EAB308` (Yellow-500) | `#451A03` (Amber-900) | `#FDE047` (Yellow-300) |
| **Diamond** | 🌌 Space | `#D946EF` (Fuchsia-500) | `#2E1065` (Violet-950) | `#F0ABFC` (Fuchsia-300) |

### 🔠 Typography
- **Headings/Numbers**: `Orbitron` (Futuristic, Digital).
- **Body/UI**: `Roboto` (Clean, Readable).

---

## Task Structure

### Task 1: Math Engine & Question Logic
**Files:**
- Create: `math_engine.js`
- Test: Manual verification via Console

**Step 1: Implement `MathEngine` class**
- Method `generateQuestion(tier)` returning `{ text, answer, options[] }`.
- Logic for Tiers 1-4.

### Task 2: Game State & Multi-Option Spawning
**Files:**
- Modify: `script.js`

**Step 1: Update State**
- Replace `food` object with `foods` array.
- Add `currentQuestion`.

**Step 2: Spawn Logic**
- Update `spawnFood()` to create 3 items: 1 Correct, 2 Distractors.

### Task 3: Collision & Scoring Rules
**Files:**
- Modify: `script.js`

**Step 1: Collision Handling**
- Match `food.value === currentQuestion.answer`.
- **Correct**: Grow (+1), Score (+5).
- **Wrong**: Shrink (-1), Score (-2), remove food.

### Task 4: Themed Visuals & Styling
**Files:**
- Modify: `style.css`
- Modify: `script.js` (ThemeManager)

**Step 1: CSS Variables Setup**
- Define theme scopes.

**Step 2: JS Trigger**
- `updateTheme(score)` function.

### Task 5: UI Overlays & Power-ups
**Files:**
- Modify: `index.html`, `style.css`

**Step 1: HUD Updates**
- Add Question Display & Tier Badge.

**Step 2: Power-up Logic**
- New entity type `Powerup` (Bomb, Potion).
