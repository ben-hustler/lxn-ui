import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Tooltip,
  CloseButton,
  useFocusTrap,
  ButtonMain,
  ButtonCard,
  ConfirmPopover,
  ListIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  SearchIcon,
  InfoIcon,
  ExternalArrowIcon,
  ViewOfferIcon,
  BackArrowIcon,
  ChevronDownIcon,
  AddCircleIcon,
  PlusIcon,
  ResetIcon,
  WarningIcon,
  CloseIcon,
  StatusBadge,
  PulseDots,
  SearchSelect,
  type SearchSelectOption,
  type IconProps,
} from '../src/index';
import './sandbox.css';

function TrashGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 7h12v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7zm3-3h6l1 2h4v2H4V6h4l1-2z" />
    </svg>
  );
}

function PrintGlyph() {
  return (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M19 8H5a3 3 0 0 0-3 3v6h4v4h12v-4h4v-6a3 3 0 0 0-3-3zM16 19H8v-5h8v5zm3-7a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM7 3h10v3H7z" />
    </svg>
  );
}

/* ============================================================
   Page chrome — Section/Subsection wrap every demo below in a
   consistent header built from tokens.css's own semantic classes
   (.lxn-h2/.lxn-eyebrow/.lxn-body-sm), not hardcoded styles.
   ============================================================ */

function Section({ id, title, description, children }: { id: string; title: string; description?: string; children: ReactNode }) {
  return (
    <section id={id} className="lxn-sandbox-section">
      <div className="lxn-sandbox-section-header">
        <h2 className="lxn-h2">{title}</h2>
        {description && <p className="lxn-body-sm">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="lxn-sandbox-subsection">
      <h3 className="lxn-eyebrow lxn-sandbox-subsection-title">{title}</h3>
      {children}
    </div>
  );
}

// Real card surface for component/interactive demos — see sandbox.css's own
// comment on .lxn-demo-surface for why (ButtonCard's primary variant is
// otherwise nearly invisible against the page's own --color-bg-app).
function DemoSurface({ children }: { children: ReactNode }) {
  return <div className="lxn-demo-surface">{children}</div>;
}

const NAV_GROUPS = [
  {
    label: 'Tokens',
    links: [
      ['tokens-colors', 'Colors'],
      ['tokens-typography', 'Typography'],
      ['tokens-spacing', 'Spacing'],
      ['tokens-radii-shadows', 'Radii & shadows'],
      ['tokens-motion', 'Motion'],
      ['tokens-icons', 'Icons'],
    ],
  },
  {
    label: 'Components',
    links: [
      ['comp-button-main', 'ButtonMain'],
      ['comp-button-card', 'ButtonCard'],
      ['comp-status-badge', 'StatusBadge'],
      ['comp-pulse-dots', 'PulseDots'],
      ['comp-close-button', 'CloseButton'],
      ['comp-confirm-popover', 'ConfirmPopover'],
      ['comp-search-select', 'SearchSelect'],
      ['comp-tooltip', 'Tooltip'],
    ],
  },
] as const;

function SandboxNav() {
  return (
    <nav className="lxn-sandbox-nav">
      {NAV_GROUPS.map((group) => (
        <div className="lxn-sandbox-nav-group" key={group.label}>
          <span className="lxn-eyebrow lxn-sandbox-nav-group-label">{group.label}</span>
          {group.links.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="lxn-l2">
              {label}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}

/* ============================================================
   Tokens — Colors
   ============================================================ */

function ColorSwatch({ token, value, hint, on }: { token: string; value: string; hint?: string; on?: string }) {
  return (
    <div className="lxn-swatch">
      <div className="lxn-swatch-chip" style={{ background: `var(${token})` }} />
      <div className="lxn-swatch-meta">
        <code className="lxn-swatch-token">{token}</code>
        <span className="lxn-l4 lxn-swatch-hint">{hint ?? value}</span>
      </div>
    </div>
  );
}

function TextSwatch({ token, value, sampleBg }: { token: string; value: string; sampleBg?: string }) {
  return (
    <div className="lxn-swatch">
      <div className="lxn-swatch-chip" style={{ background: sampleBg ?? 'var(--color-bg-surface)' }}>
        <span className="lxn-swatch-chip-text" style={{ color: `var(${token})` }}>
          Aa
        </span>
      </div>
      <div className="lxn-swatch-meta">
        <code className="lxn-swatch-token">{token}</code>
        <span className="lxn-l4 lxn-swatch-hint">{value}</span>
      </div>
    </div>
  );
}

function BorderSwatch({ token, value }: { token: string; value: string }) {
  return (
    <div className="lxn-swatch" style={{ borderWidth: 2, borderColor: `var(${token})` }}>
      <div className="lxn-swatch-chip" />
      <div className="lxn-swatch-meta">
        <code className="lxn-swatch-token">{token}</code>
        <span className="lxn-l4 lxn-swatch-hint">{value}</span>
      </div>
    </div>
  );
}

function FeedbackSwatch({ fg, bg, fgValue, bgValue }: { fg: string; bg: string; fgValue: string; bgValue: string }) {
  return (
    <div className="lxn-swatch">
      <div className="lxn-swatch-chip" style={{ background: `var(${bg})` }}>
        <span className="lxn-swatch-chip-text" style={{ color: `var(${fg})` }}>
          Aa
        </span>
      </div>
      <div className="lxn-swatch-meta">
        <code className="lxn-swatch-token">{fg}</code>
        <span className="lxn-l4 lxn-swatch-hint">{fgValue}</span>
        <code className="lxn-swatch-token" style={{ marginTop: 4 }}>
          {bg}
        </code>
        <span className="lxn-l4 lxn-swatch-hint">{bgValue}</span>
      </div>
    </div>
  );
}

function DataVizSwatch({ token, value, label }: { token: string; value: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 12, height: 12, borderRadius: '50%', background: `var(${token})`, flexShrink: 0 }} />
      <span className="lxn-l2">
        {label} <span className="lxn-l4">— {value}</span>
      </span>
    </div>
  );
}

function TokensColorsSection() {
  return (
    <Section
      id="tokens-colors"
      title="Colors"
      description="Semantic tokens only — the layer consumers should actually reach for. Each name is the var() to use; the value shown is what it currently resolves to."
    >
      <Subsection title="Surfaces">
        <div className="lxn-swatch-grid">
          <ColorSwatch token="--color-bg-app" value="#EEEEEE" hint="App canvas background" />
          <ColorSwatch token="--color-bg-surface" value="#FFFFFF" hint="Card / panel surface" />
          <ColorSwatch token="--color-bg-sunken" value="#F6F7F7" hint="Recessed / inset panel" />
          <ColorSwatch token="--color-bg-inverse" value="#191919" hint="Dark side panel" />
          <ColorSwatch token="--color-bg-overlay" value="rgba(17,19,21,.40)" hint="Modal scrim" />
        </div>
      </Subsection>

      <Subsection title="Text">
        <div className="lxn-swatch-grid">
          <TextSwatch token="--color-fg-primary" value="#000000 — body text" />
          <TextSwatch token="--color-fg-secondary" value="#515D5F — secondary text" />
          <TextSwatch token="--color-fg-tertiary" value="#949C9C — tertiary / placeholder" />
          <TextSwatch token="--color-fg-disabled" value="#C7CFCF — disabled label" />
          <TextSwatch token="--color-fg-on-primary" value="#FFFFFF — on a primary-colored surface" sampleBg="var(--color-action-primary)" />
          <TextSwatch token="--color-fg-on-inverse" value="#FFFFFF — on --color-bg-inverse" sampleBg="var(--color-bg-inverse)" />
          <TextSwatch token="--color-fg-link" value="#0F8F8F — links" />
          <TextSwatch token="--color-fg-accent" value="#0F8F8F — accent / active state" />
        </div>
      </Subsection>

      <Subsection title="Borders">
        <div className="lxn-swatch-grid">
          <BorderSwatch token="--color-border-strong" value="#C7CFCF" />
          <BorderSwatch token="--color-border" value="#D4D8DB — default" />
          <BorderSwatch token="--color-border-subtle" value="#E2E5E5 — hairlines / dividers" />
        </div>
      </Subsection>

      <Subsection title="Action (ButtonMain primary states)">
        <div className="lxn-swatch-grid">
          <ColorSwatch token="--color-action-primary" value="#219C88" hint="Resting" />
          <ColorSwatch token="--color-action-primary-hover" value="#35BA9B" hint="Hover" />
          <ColorSwatch token="--color-action-primary-press" value="#00A17B" hint="Press" />
          <ColorSwatch token="--color-action-primary-disabled" value="#D4D8DB" hint="Disabled" />
          <ColorSwatch token="--color-hover-accent-bg" value="#D9F0F7" hint="Icon-button hover tint" />
        </div>
      </Subsection>

      <Subsection title="Status pairs (see StatusBadge below for real usage)">
        <div className="lxn-swatch-grid">
          <FeedbackSwatch fg="--color-status-open-fg" fgValue="white" bg="--color-status-open-bg" bgValue="#E0A10E" />
          <FeedbackSwatch fg="--color-status-accepted-fg" fgValue="white" bg="--color-status-accepted-bg" bgValue="#35BA9B" />
          <FeedbackSwatch fg="--color-status-expired-fg" fgValue="white" bg="--color-status-expired-bg" bgValue="#515D5F" />
          <FeedbackSwatch fg="--color-status-locked-fg" fgValue="white" bg="--color-status-locked-bg" bgValue="#810909" />
        </div>
      </Subsection>

      <Subsection title="Feedback">
        <div className="lxn-swatch-grid">
          <FeedbackSwatch fg="--color-success" fgValue="#00A17B" bg="--color-success-bg" bgValue="#D6F2E7" />
          <FeedbackSwatch fg="--color-warning" fgValue="#FDB712" bg="--color-warning-bg" bgValue="#FBE9C8" />
          <FeedbackSwatch fg="--color-negative" fgValue="#BA0730" bg="--color-negative-bg" bgValue="#FBE0E0" />
          <FeedbackSwatch fg="--color-error" fgValue="#FF2E5E" bg="--color-error-bg" bgValue="#FFE0E8" />
          <FeedbackSwatch fg="--color-info" fgValue="#3D7BD9" bg="--color-info-bg" bgValue="#DCE7F7" />
        </div>
      </Subsection>

      <Subsection title="Data visualization (charts/analytics only — never a substitute for semantic colors elsewhere)">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <DataVizSwatch token="--color-data-customer" value="#A86DE0" label="Customer & Total" />
          <DataVizSwatch token="--color-data-disclosures" value="#7D7BE9" label="Disclosures" />
          <DataVizSwatch token="--color-data-inspection" value="#558DE2" label="Inspection" />
          <DataVizSwatch token="--color-data-appraisal" value="#46B7C8" label="Appraisal & Open" />
          <DataVizSwatch token="--color-data-offer" value="#42BCA8" label="Offer" />
          <DataVizSwatch token="--color-data-won" value="#35BA9B" label="Won" />
          <DataVizSwatch token="--color-data-lost" value="#BA0730" label="Lost" />
          <DataVizSwatch token="--color-data-unknown" value="#398190" label="Unknown" />
        </div>
      </Subsection>
    </Section>
  );
}

/* ============================================================
   Tokens — Typography
   ============================================================ */

const TYPE_ROWS: { cls: string; sample: string }[] = [
  { cls: 'lxn-h1', sample: 'Page-level title' },
  { cls: 'lxn-h2', sample: 'Primary heading / vehicle title' },
  { cls: 'lxn-h3', sample: 'Panel / card title' },
  { cls: 'lxn-h4', sample: 'Sub-section heading (medium)' },
  { cls: 'lxn-h5', sample: 'Sub-section heading (regular)' },
  { cls: 'lxn-h6', sample: 'Smallest heading' },
  { cls: 'lxn-b1', sample: 'Lead body copy' },
  { cls: 'lxn-b2', sample: 'Default body copy' },
  { cls: 'lxn-b3', sample: 'Emphasized body copy' },
  { cls: 'lxn-body', sample: 'Body text (alias of b2)' },
  { cls: 'lxn-body-sm', sample: 'Small supporting copy' },
  { cls: 'lxn-l1', sample: 'Large form-field label' },
  { cls: 'lxn-l2', sample: 'Secondary / inline meta' },
  { cls: 'lxn-l3', sample: 'Default form label' },
  { cls: 'lxn-l4', sample: 'Placeholder / disabled label' },
  { cls: 'lxn-label', sample: 'Field label' },
  { cls: 'lxn-eyebrow', sample: 'Section eyebrow' },
  { cls: 'lxn-mono', sample: 'VIN 1HGCM82633A004352' },
  { cls: 'lxn-n1', sample: '$24,500' },
  { cls: 'lxn-n2', sample: '$18,200' },
  { cls: 'lxn-n3', sample: '$6,300' },
  { cls: 'lxn-n4', sample: '42,118 mi' },
  { cls: 'lxn-n5', sample: '2019 Accord' },
];

function TypeRow({ cls, sample }: { cls: string; sample: string }) {
  const sampleRef = useRef<HTMLSpanElement>(null);
  const [computed, setComputed] = useState('');

  useEffect(() => {
    const el = sampleRef.current;
    if (!el) return;
    const style = getComputedStyle(el);
    const family = style.fontFamily.split(',')[0].replace(/["']/g, '');
    setComputed(
      `${style.fontWeight} · ${style.fontSize}/${style.lineHeight} · ${family}` +
        (style.letterSpacing !== 'normal' && style.letterSpacing !== '0px' ? ` · ${style.letterSpacing}` : ''),
    );
  }, []);

  return (
    <div className="lxn-type-row" key={cls}>
      <code className="lxn-type-row-label">.{cls}</code>
      <span className={`${cls} lxn-type-row-sample`} ref={sampleRef}>
        {sample}
      </span>
      <code className="lxn-type-row-computed">{computed}</code>
    </div>
  );
}

function TokensTypographySection() {
  return (
    <Section id="tokens-typography" title="Typography" description="Reach for these classes before hand-composing font/color custom properties — see tokens.css's own header comment.">
      {TYPE_ROWS.map(({ cls, sample }) => (
        <TypeRow cls={cls} sample={sample} key={cls} />
      ))}
    </Section>
  );
}

/* ============================================================
   Tokens — Spacing
   ============================================================ */

const SPACE_TOKENS: { token: string; px: number }[] = [
  { token: '--space-0', px: 0 },
  { token: '--space-1', px: 4 },
  { token: '--space-2', px: 8 },
  { token: '--space-3', px: 12 },
  { token: '--space-4', px: 16 },
  { token: '--space-5', px: 20 },
  { token: '--space-6', px: 24 },
  { token: '--space-8', px: 32 },
  { token: '--space-10', px: 40 },
  { token: '--space-12', px: 48 },
  { token: '--space-16', px: 64 },
];

function TokensSpacingSection() {
  return (
    <Section id="tokens-spacing" title="Spacing" description="4px grid — use these for gap/padding/margin instead of one-off pixel values.">
      {SPACE_TOKENS.map(({ token, px }) => (
        <div className="lxn-space-row" key={token}>
          <code className="lxn-space-row-label">
            {token} · {px}px
          </code>
          <span className="lxn-space-bar" style={{ width: Math.max(px, 2) }} />
        </div>
      ))}
    </Section>
  );
}

/* ============================================================
   Tokens — Radii & Shadows
   ============================================================ */

function TokensRadiiShadowsSection() {
  return (
    <Section id="tokens-radii-shadows" title="Radii & shadows">
      <Subsection title="Radii">
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {[
            { token: '--radius-sm', label: 'sm — inputs, chips, buttons, cards' },
            { token: '--radius-md', label: 'md — large surfaces, tile launchers' },
            { token: '--radius-pill', label: 'pill — pill / circular tokens' },
          ].map(({ token, label }) => (
            <div key={token} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: 140 }}>
              <div className="lxn-radius-swatch" style={{ borderRadius: `var(${token})` }} />
              <span className="lxn-l4" style={{ textAlign: 'center' }}>
                <code className="lxn-swatch-token">{token}</code>
                <span className="lxn-sandbox-demo-label">{label}</span>
              </span>
            </div>
          ))}
        </div>
      </Subsection>

      <Subsection title="Shadows">
        <div className="lxn-shadow-grid">
          {['--shadow-xs', '--shadow-sm', '--shadow-md', '--shadow-lg', '--shadow-xl', '--shadow-focus'].map((token) => (
            <div key={token} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div className="lxn-shadow-card" style={{ boxShadow: `var(${token})` }} />
              <code className="lxn-swatch-token">{token}</code>
            </div>
          ))}
        </div>
      </Subsection>
    </Section>
  );
}

/* ============================================================
   Tokens — Motion
   ============================================================ */

const MOTION_TRACKS = [
  { key: 'quick', label: '--motion-quick (120ms) / --ease-standard' },
  { key: 'base', label: '--motion-base (180ms) / --ease-standard' },
  { key: 'slow', label: '--motion-slow (260ms) / --ease-emphasized' },
] as const;

function TokensMotionSection() {
  const [active, setActive] = useState(false);

  const replay = () => {
    setActive(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setActive(true)));
  };

  return (
    <Section id="tokens-motion" title="Motion" description="Shared durations/easings — keeps transitions consistent across webcomps instead of each hand-picking its own.">
      <DemoSurface>
        <div className="lxn-sandbox-stack" style={{ maxWidth: 480 }}>
          {MOTION_TRACKS.map(({ key, label }) => (
            <div className="lxn-motion-row" key={key}>
              <span className="lxn-l4 lxn-motion-row-label">{label}</span>
              <div className={`lxn-motion-track lxn-motion-track--${key} lxn-motion-row-track${active ? ' is-active' : ''}`}>
                <span className="lxn-motion-dot" />
              </div>
            </div>
          ))}
          <ButtonMain label="Replay" variant="tertiary" size="small" onClick={replay} />
        </div>
      </DemoSurface>
    </Section>
  );
}

/* ============================================================
   Tokens — Icons
   ============================================================ */

const ICONS: { Icon: (props: IconProps) => ReactNode; name: string; source: string }[] = [
  { Icon: ListIcon, name: 'ListIcon', source: 'Lucide list' },
  { Icon: PencilIcon, name: 'PencilIcon', source: 'Lucide edit (classic, pre-rename)' },
  { Icon: TrashIcon, name: 'TrashIcon', source: 'Lucide trash' },
  { Icon: CheckIcon, name: 'CheckIcon', source: 'Lucide check' },
  { Icon: SearchIcon, name: 'SearchIcon', source: 'Lucide search' },
  { Icon: InfoIcon, name: 'InfoIcon', source: 'Lucide info' },
  { Icon: ExternalArrowIcon, name: 'ExternalArrowIcon', source: 'Lucide arrow-up-right' },
  { Icon: ViewOfferIcon, name: 'ViewOfferIcon', source: 'Lucide external-link' },
  { Icon: BackArrowIcon, name: 'BackArrowIcon', source: 'Lucide chevron-left' },
  { Icon: ChevronDownIcon, name: 'ChevronDownIcon', source: 'Lucide chevron-down' },
  { Icon: AddCircleIcon, name: 'AddCircleIcon', source: 'Material add_circle (filled)' },
  { Icon: PlusIcon, name: 'PlusIcon', source: 'Material add (filled)' },
  { Icon: ResetIcon, name: 'ResetIcon', source: 'Lucide rotate-ccw' },
  { Icon: WarningIcon, name: 'WarningIcon', source: 'Lucide circle-alert' },
  { Icon: CloseIcon, name: 'CloseIcon', source: 'Material close (filled)' },
];

function TokensIconsSection() {
  return (
    <Section
      id="tokens-icons"
      title="Icons"
      description="Every icon lxn-ui exports — a verbatim copy of a real, published glyph (Lucide/ISC or Material/Apache-2.0), never hand-drawn. Full provenance table: src/components/icons/ICONS.md."
    >
      <div className="lxn-swatch-grid">
        {ICONS.map(({ Icon, name, source }) => (
          <div className="lxn-icon-card" key={name}>
            <span className="lxn-icon-card-glyph">
              <Icon size={24} />
            </span>
            <code className="lxn-swatch-token">{name}</code>
            <span className="lxn-l4">{source}</span>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============================================================
   Components — ButtonMain
   ============================================================ */

function ButtonMainSection() {
  const [loading, setLoading] = useState(false);

  return (
    <Section id="comp-button-main" title="ButtonMain" description="Main CTA button — primary/secondary/tertiary/danger, in large/small/wide sizes.">
      <DemoSurface>
        <Subsection title="Variants (large)">
          <div className="lxn-sandbox-row">
            <ButtonMain label="Primary" variant="primary" size="large" />
            <ButtonMain label="Secondary" variant="secondary" size="large" />
            <ButtonMain label="Tertiary" variant="tertiary" size="large" />
            <ButtonMain label="Danger" variant="danger" size="large" />
          </div>
        </Subsection>

        <Subsection title="Variants (small)">
          <div className="lxn-sandbox-row">
            <ButtonMain label="Primary" variant="primary" size="small" />
            <ButtonMain label="Secondary" variant="secondary" size="small" />
            <ButtonMain label="Tertiary" variant="tertiary" size="small" />
            <ButtonMain label="Danger" variant="danger" size="small" />
          </div>
        </Subsection>

        <Subsection title="Full width">
          <div className="lxn-sandbox-stack">
            <ButtonMain label="Full width" variant="primary" fullWidth />
          </div>
        </Subsection>

        <Subsection title="Wide + full-width pairing (appraisal-offer's Accept / View Offer)">
          <div className="lxn-sandbox-stack" style={{ alignItems: 'stretch' }}>
            <ButtonMain label="Accept" variant="primary" size="wide" />
            <ButtonMain label="View Offer" variant="secondary" fullWidth />
          </div>
        </Subsection>

        <Subsection title="Icon + label (leading vs. trailing), and icon-only">
          <div className="lxn-sandbox-row">
            <ButtonMain label="Print" icon={<PrintGlyph />} variant="tertiary" size="large" />
            <ButtonMain label="View Offer" icon={<PrintGlyph />} iconPosition="trailing" variant="secondary" size="large" />
            <ButtonMain icon={<PrintGlyph />} aria-label="Print" variant="tertiary" size="large" />
            <ButtonMain icon={<PrintGlyph />} aria-label="Print" variant="tertiary" size="small" />
          </div>
        </Subsection>

        <Subsection title="Loading & disabled">
          <div className="lxn-sandbox-stack">
            <ButtonMain
              label="Generate Offer"
              loadingLabel="Generating…"
              loading={loading}
              variant="primary"
              onClick={() => {
                setLoading(true);
                setTimeout(() => setLoading(false), 1500);
              }}
            />
            <ButtonMain label="Disabled" variant="primary" disabled />
          </div>
        </Subsection>
      </DemoSurface>
    </Section>
  );
}

/* ============================================================
   Components — ButtonCard
   ============================================================ */

function ButtonCardSection() {
  return (
    <Section id="comp-button-card" title="ButtonCard" description="Compact in-card row button — History/Edit/Remove on a customer/detail card. Only primary/danger variants exist on purpose.">
      <DemoSurface>
        <Subsection title="Variants">
          {/* Grid, not a flex row: fullWidth relies on the item's own 100%
              width, which a wrapping flex row can't give it equally (each
              item would just claim the whole row and wrap the next one). */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 520 }}>
            <ButtonCard label="History" icon={<ListIcon size={18} />} variant="primary" fullWidth />
            <ButtonCard label="Edit" icon={<PencilIcon size={18} />} variant="primary" fullWidth />
            <ButtonCard label="Remove" icon={<TrashIcon size={18} />} variant="danger" fullWidth />
          </div>
        </Subsection>

        <Subsection title="Icon-only & disabled">
          <div className="lxn-sandbox-row">
            <ButtonCard icon={<TrashIcon size={18} />} aria-label="Remove" variant="danger" />
            <ButtonCard label="Edit" icon={<PencilIcon size={18} />} variant="primary" disabled />
          </div>
        </Subsection>
      </DemoSurface>
    </Section>
  );
}

/* ============================================================
   Components — StatusBadge
   ============================================================ */

function StatusBadgeSection() {
  return (
    <Section
      id="comp-status-badge"
      title="StatusBadge"
      description="Icon or icon+label chip — the consumer always supplies the background color (lxn-ui owns no status vocabulary of its own)."
    >
      <DemoSurface>
        <div className="lxn-sandbox-row">
          <StatusBadge label="Selected" icon={<CheckIcon size={12} />} background="var(--color-status-accepted-bg)" />
          <StatusBadge label="Open" icon={<CheckIcon size={12} />} background="var(--color-status-open-bg)" />
          <StatusBadge label="Expired" icon={<CheckIcon size={12} />} background="var(--color-status-expired-bg)" />
          <StatusBadge label="Locked" icon={<CheckIcon size={12} />} background="var(--color-status-locked-bg)" />
          <StatusBadge icon={<CheckIcon size={12} />} aria-label="Selected" background="var(--color-status-accepted-bg)" />
        </div>
      </DemoSurface>
    </Section>
  );
}

/* ============================================================
   Components — PulseDots
   ============================================================ */

function PulseDotsSection() {
  return (
    <Section id="comp-pulse-dots" title="PulseDots" description="Three-dot loading pulse — pair with your own loading copy; lxn-ui doesn't own that text.">
      <DemoSurface>
        <PulseDots aria-label="Generating preview" />
      </DemoSurface>
    </Section>
  );
}

/* ============================================================
   Components — CloseButton
   ============================================================ */

function CloseButtonSection() {
  const [open, setOpen] = useState(false);
  const dialogRef = useFocusTrap<HTMLDialogElement>(() => setOpen(false));

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open, dialogRef]);

  return (
    <Section
      id="comp-close-button"
      title="CloseButton"
      description="Icon-only dismiss button for modal/popup shells, paired here with useFocusTrap. Escape, the ✕, and Tab/Shift+Tab cycling all work inside the dialog."
    >
      <div style={{ marginBottom: 12 }}>
        <StatusBadge label="Deprecated" icon={<WarningIcon size={12} />} background="var(--color-warning)" />
        <p className="lxn-body-sm" style={{ marginTop: 6, maxWidth: 480 }}>
          Every consumer moved the ✕ inside the modal card itself instead of floating it fixed to a viewport
          corner — see each app's own <code>*-close-icon-btn</code>. Left here for reference, not for new work.
        </p>
      </div>
      <DemoSurface>
        <ButtonMain label="Open dialog" variant="secondary" size="small" onClick={() => setOpen(true)} />
      </DemoSurface>
      <dialog ref={dialogRef} onCancel={(e) => e.preventDefault()} style={{ position: 'relative', padding: 32, border: 'none', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-xl)' }}>
        <CloseButton onClick={() => setOpen(false)} style={{ position: 'absolute', top: 12, right: 12 }} />
        <p className="lxn-body" style={{ marginTop: 0, maxWidth: 320 }}>
          Tab/Shift+Tab cycles within this dialog; Escape and the ✕ both close it.
        </p>
        <input className="lxn-body" placeholder="focusable field" />
      </dialog>
    </Section>
  );
}

/* ============================================================
   Components — ConfirmPopover
   ============================================================ */

function ConfirmPopoverSection() {
  const [open, setOpen] = useState(false);
  // ButtonMain doesn't forward refs, so the anchor is this wrapping span
  // (hugs the button's box via inline-block) rather than the button itself —
  // same workaround a consumer needs today; see appraisal-customer's
  // IconButton for the alternative (a plain <button> can take a ref directly).
  const anchorRef = useRef<HTMLSpanElement>(null);

  return (
    <Section id="comp-confirm-popover" title="ConfirmPopover" description="Anchored confirm-before-you-act prompt — flip/slide math exercised against a real anchor button, not a synthetic rect.">
      <DemoSurface>
        <span ref={anchorRef} style={{ display: 'inline-block' }}>
          <ButtonMain icon={<TrashGlyph />} aria-label="Remove" variant="tertiary" size="small" onClick={() => setOpen((v) => !v)} />
        </span>
      </DemoSurface>
      <ConfirmPopover
        open={open}
        anchorRef={anchorRef}
        onClose={() => setOpen(false)}
        onConfirm={() => setOpen(false)}
        message="Remove John Doe from this appraisal? You can re-add them later."
        confirmLabel="Remove"
        destructive
      />
    </Section>
  );
}

/* ============================================================
   Components — SearchSelect
   ============================================================ */

const SEARCH_SELECT_OPTIONS: SearchSelectOption[] = [
  { id: 'u1', label: 'Alex Rivera', subheader: 'Salesperson' },
  { id: 'u2', label: 'Jordan Lee', subheader: 'Salesperson' },
  { id: 'u3', label: 'Sam Patel', subheader: 'Manager' },
  { id: 'u4', label: 'Morgan Chen', subheader: 'Manager' },
  { id: 'u5', label: 'Casey Kim', subheader: 'Salesperson' },
];

function SearchSelectSection() {
  const [value, setValue] = useState('');
  const [options, setOptions] = useState(SEARCH_SELECT_OPTIONS);
  const [isLoading, setIsLoading] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const [triggerValue, setTriggerValue] = useState('');

  // Stands in for a real network search — onSearch only ever gets the raw
  // query (see SearchSelect.tsx's own comment); filtering is always the
  // caller's job, simulated here with a short delay so isLoading actually
  // has something to show.
  const handleSearch = (query: string) => {
    setIsLoading(true);
    clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      const q = query.trim().toLowerCase();
      setOptions(q ? SEARCH_SELECT_OPTIONS.filter((o) => o.label.toLowerCase().includes(q)) : SEARCH_SELECT_OPTIONS);
      setIsLoading(false);
    }, 250);
  };

  useEffect(() => () => clearTimeout(searchTimeoutRef.current), []);

  return (
    <Section
      id="comp-search-select"
      title="SearchSelect"
      description="Generic searchable/typeahead select — usable immediately without typing; filtering is always the caller's job via onSearch, this component only renders whatever options it's handed."
    >
      <DemoSurface>
        <Subsection title="Interactive (simulated async search)">
          <div style={{ width: 280 }}>
            <SearchSelect
              value={value}
              options={options}
              onSelect={setValue}
              onSearch={handleSearch}
              isLoading={isLoading}
              placeholderLabel="Assign salesperson…"
            />
          </div>
        </Subsection>

        <Subsection title="Custom trigger (renderTrigger)">
          <div style={{ width: 280 }}>
            <SearchSelect
              value={triggerValue}
              options={SEARCH_SELECT_OPTIONS}
              onSelect={setTriggerValue}
              renderTrigger={({ selected, onClick }) => (
                <ButtonMain label={selected ? selected.label : 'Assign…'} variant="tertiary" size="small" fullWidth onClick={onClick} />
              )}
            />
          </div>
        </Subsection>

        <Subsection title="Loading & empty states">
          <div className="lxn-sandbox-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ width: 240 }}>
              <SearchSelect value="" options={[]} onSelect={() => {}} isLoading placeholderLabel="Assign…" />
            </div>
            <div style={{ width: 240 }}>
              <SearchSelect value="" options={[]} onSelect={() => {}} emptyLabel="No matches" placeholderLabel="Assign…" />
            </div>
          </div>
        </Subsection>
      </DemoSurface>
    </Section>
  );
}

/* ============================================================
   Components — Tooltip
   ============================================================ */

const EDGE_CASES = [
  ['top', '8px', '50%', undefined, undefined],
  ['top-left', '8px', undefined, '8px', undefined],
  ['top-right', '8px', undefined, undefined, '8px'],
  ['bottom-left', undefined, undefined, '8px', undefined],
  ['bottom-right', undefined, undefined, undefined, '8px'],
] as const;

function TooltipSection() {
  return (
    <Section
      id="comp-tooltip"
      title="Tooltip"
      description="Hover/focus bubble that flips above/below and slides to stay clear of the viewport edge. The five dots below are pinned to the real viewport corners (not a container) to exercise that math — resize the browser window to see them stay clamped."
    >
      <DemoSurface>
        <Subsection title="Basic usage">
          <div className="lxn-sandbox-row">
            <Tooltip text="Short tip">
              <span className="lxn-icon-swatch" style={{ borderRadius: '50%', cursor: 'default' }}>
                <span className="lxn-l4">i</span>
              </span>
            </Tooltip>

            <Tooltip text="A much longer tooltip message, if imbalanced, it'll leave an orphan right -> here <-">
              <span className="lxn-l2" style={{ cursor: 'default', textDecoration: 'underline dotted' }}>
                Hover for an (imbalanced?) tooltip
              </span>
            </Tooltip>
          </div>
        </Subsection>
      </DemoSurface>

      {EDGE_CASES.map(([label, top, left, leftFixed, rightFixed]) => (
        <div
          key={label}
          style={{
            position: 'fixed',
            top,
            left: left ?? leftFixed,
            right: rightFixed,
            bottom: top ? undefined : '8px',
            transform: left === '50%' ? 'translateX(-50%)' : undefined,
            // Above the sticky nav (z-index 10) — otherwise the top-row
            // dots render fully hidden underneath it and can't be hovered.
            zIndex: 11,
          }}
        >
          <Tooltip text={`Edge case: ${label} — long enough to wrap and test sliding`}>
            <span className="lxn-icon-swatch" style={{ borderRadius: '50%', cursor: 'default', background: 'var(--color-bg-surface)' }}>
              <span className="lxn-l4">i</span>
            </span>
          </Tooltip>
        </div>
      ))}
    </Section>
  );
}

/* ============================================================
   Sandbox — dev-only harness, mounts real components against
   sample content so we can iterate on them live (npm run dev)
   without needing a consumer repo checked out. Nothing here ships.
   ============================================================ */

export function Sandbox() {
  return (
    <div className="lxn-sandbox">
      <SandboxNav />
      <div className="lxn-sandbox-content">
        <TokensColorsSection />
        <TokensTypographySection />
        <TokensSpacingSection />
        <TokensRadiiShadowsSection />
        <TokensMotionSection />
        <TokensIconsSection />

        <ButtonMainSection />
        <ButtonCardSection />
        <StatusBadgeSection />
        <PulseDotsSection />
        <CloseButtonSection />
        <ConfirmPopoverSection />
        <SearchSelectSection />
        <TooltipSection />
      </div>
    </div>
  );
}
