// Framework-agnostic tooltip controller. One instance, reused for every
// show()/hide() call from its owner — same "one shared node" approach as
// Bubble's own Tippy.js, and the Lit tippy-clone this was ported from
// (see lxn-pdf-generator/src/lexen-offer-sheet.js, _ensureTooltip/_showTooltip).
//
// Two features folded in from appraisal-offer's InfoTooltip.tsx that the
// original Lit version didn't have:
//  - portals into the nearest ancestor <dialog> instead of always
//    document.body, so it isn't rendered behind a top-layer <dialog>
//    (native top-layer promotion puts a body-level sibling behind it).
//  - repositions on scroll/resize while visible, instead of positioning
//    once on show and going stale if the page moves under it.

export class TooltipController {
  private outer: HTMLDivElement | null = null;
  private bubble: HTMLDivElement | null = null;
  private label: HTMLSpanElement | null = null;
  private anchor: HTMLElement | null = null;

  private readonly reposition = (): void => this.updatePosition();

  private ensure(): void {
    if (this.outer) return;

    const outer = document.createElement('div');
    Object.assign(outer.style, {
      position: 'fixed',
      top: '0px',
      left: '0px',
      zIndex: '2147483647',
      pointerEvents: 'none',
    });

    const bubble = document.createElement('div');
    Object.assign(bubble.style, {
      position: 'relative',
      boxSizing: 'content-box',
      background: '#333',
      color: '#fff',
      borderRadius: '4px',
      fontSize: '14px',
      lineHeight: '1.4',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      whiteSpace: 'normal',
      textAlign: 'center',
      padding: '8px',
      maxWidth: '240px',
      opacity: '0',
    });

    const label = document.createElement('span');
    bubble.appendChild(label);

    const arrow = document.createElement('div');
    Object.assign(arrow.style, {
      position: 'absolute',
      // 1px overlap, not flush at 100% — avoids a hairline seam once the
      // bubble is animating and gets promoted to its own compositor layer.
      top: 'calc(100% - 1px)',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '0',
      height: '0',
      borderStyle: 'solid',
      borderWidth: '8px 8px 0',
      borderColor: '#333 transparent transparent transparent',
    });
    bubble.appendChild(arrow);

    outer.appendChild(bubble);

    this.outer = outer;
    this.bubble = bubble;
    this.label = label;
  }

  show(anchor: HTMLElement, text: string): void {
    this.ensure();
    const outer = this.outer!;
    const bubble = this.bubble!;
    const label = this.label!;

    this.anchor = anchor;

    const target = anchor.closest('dialog') ?? document.body;
    if (outer.parentElement !== target) target.appendChild(outer);

    // No CSS sizing keyword (width:max-content, display:table/inline-block)
    // actually shrinks a box to its post-wrap line width — they all just
    // clamp to max-width once the text needs more than one line, ignoring
    // how narrow the wrapped lines end up. Measure it for real: let it wrap
    // at max-width, read the widest rendered line via Range rects, then set
    // that as the explicit width.
    bubble.style.width = '';
    label.textContent = text;
    const range = document.createRange();
    range.selectNodeContents(label);
    const lineWidths = Array.from(range.getClientRects(), (r) => r.width);
    bubble.style.width = `${Math.ceil(Math.max(...lineWidths))}px`;

    this.updatePosition();

    window.addEventListener('scroll', this.reposition, true);
    window.addEventListener('resize', this.reposition);

    bubble.getAnimations().forEach((a) => a.cancel());
    bubble.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0)' },
      ],
      { duration: 160, easing: 'ease-out', fill: 'forwards' },
    );
  }

  hide(): void {
    window.removeEventListener('scroll', this.reposition, true);
    window.removeEventListener('resize', this.reposition);

    const bubble = this.bubble;
    if (!bubble) return;
    bubble.getAnimations().forEach((a) => a.cancel());
    bubble.animate(
      [
        { opacity: 1, transform: 'translateY(0)' },
        { opacity: 0, transform: 'translateY(6px)' },
      ],
      { duration: 120, easing: 'ease-in', fill: 'forwards' },
    );
  }

  destroy(): void {
    this.hide();
    this.outer?.remove();
    this.outer = null;
    this.bubble = null;
    this.label = null;
    this.anchor = null;
  }

  private updatePosition(): void {
    if (!this.anchor || !this.outer) return;
    const outer = this.outer;
    const rect = this.anchor.getBoundingClientRect();
    // Positioned via transform (compositor-only, no layout/reflow — this
    // runs on every scroll event, so that matters), but with a pixel value
    // WE round in JS first, not a CSS percentage. translate(-50%) of a
    // fractional rendered width hands the browser a sub-pixel offset it
    // applies as-is; translate3d(Xpx, Ypx, 0) with a pre-rounded X/Y gets
    // the same GPU-compositor positioning without that risk.
    const left = Math.round(rect.left + rect.width / 2 - outer.offsetWidth / 2);
    const top = Math.round(rect.top - 10 - outer.offsetHeight);
    outer.style.transform = `translate3d(${left}px, ${top}px, 0)`;
  }
}
