// main is the SHARED BASE only — genuinely branch-agnostic, non-visual logic.
// Visual components (ButtonMain, CloseButton, Tooltip) and tokens/tokens.css
// live only on the bubble-inspired / mobile-inspired branches, forked and
// self-contained per branch. See README.md for the full model.
export { useFocusTrap } from './components/focus-trap/useFocusTrap';
