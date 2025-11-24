# Adjust Rumor Growth Rate

The user wants the rumors to grow 30% more aggressively as the game progresses (i.e., as confusion increases).

## User Review Required

> [!NOTE]
> This change will make the rumors significantly larger towards the end of the game, potentially increasing difficulty and visual chaos.

## Proposed Changes

### Game Logic

#### [MODIFY] [game.js](file:///Users/thomnagy/Library/Mobile Documents/com~apple~CloudDocs/Programming/ITBSGame/game.js)

- Update the `stressScaleMultiplier` calculation in both the `update` loop and the `draw` loop.
- Change `1 + (confusion / 120)` to `1 + (confusion / 120) * 1.3`.

## Verification Plan

### Automated Tests
- None available.

### Manual Verification
- **Visual Check**: Play the game and observe rumor size as confusion increases.
- **Comparison**: Compare the final size of rumors at high confusion levels to previous gameplay (mental check or screenshot comparison if possible).
- **Console Log**: Temporarily log `stressScaleMultiplier` to verify the value reaches ~2.08 at 100 confusion (vs ~1.83 previously).
