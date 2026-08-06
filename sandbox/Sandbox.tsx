import { Tooltip } from '../src/index';

// Nothing here ships — this just mounts real components against sample
// content so we can iterate on them live (npm run dev) without needing a
// consumer repo checked out.
export function Sandbox() {
  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        padding: 64,
        display: 'flex',
        gap: 32,
      }}
    >
      <Tooltip text="Short tip">
        <span
          style={{
            cursor: 'default',
            border: '1px solid #ccc',
            borderRadius: '50%',
            width: 20,
            height: 20,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
          }}
        >
          i
        </span>
      </Tooltip>

      <Tooltip text="A much longer tooltip message, long enough to check that width-measuring and wrapping behave correctly across multiple lines">
        <span style={{ cursor: 'default', textDecoration: 'underline dotted' }}>
          Hover for a long tooltip
        </span>
      </Tooltip>
    </div>
  );
}
