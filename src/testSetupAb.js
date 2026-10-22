// Vitest setup: older tests pin the B subhead, so a fresh roll lands on B in tests.
// src/paywallSubheadAB.test.jsx seeds or rolls its own arms.
import { setSubhead1RollForTests } from "./abSubhead1.js";
setSubhead1RollForTests(() => 0.99);
