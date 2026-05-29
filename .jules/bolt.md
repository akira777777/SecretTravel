# Bolt's Journal - Critical Learnings

## 2025-05-29 - Optimized Scroll Handling
**Learning:** Multiple scroll listeners performing DOM updates independently can lead to layout thrashing and redundant work. Unifying these into a single handler throttled by requestAnimationFrame ensures all scroll-based UI updates are batched into a single paint cycle.
**Action:** Always check for overlapping scroll/resize listeners and consolidate them into a single throttled manager.
