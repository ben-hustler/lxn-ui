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

      {/* Edge-case anchors for manually checking flip/slide behavior — hover
          each corner/edge and confirm the bubble stays fully on-screen while
          the arrow keeps pointing at the dot. */}
      {(
        [
          ['top', '8px', '50%', undefined, undefined],
          ['top-left', '8px', undefined, '8px', undefined],
          ['top-right', '8px', undefined, undefined, '8px'],
          ['bottom-left', undefined, undefined, '8px', undefined],
          ['bottom-right', undefined, undefined, undefined, '8px'],
        ] as const
      ).map(([label, top, left, leftFixed, rightFixed]) => (
        <div
          key={label}
          style={{
            position: 'fixed',
            top,
            left: left ?? leftFixed,
            right: rightFixed,
            bottom: top ? undefined : '8px',
            transform: left === '50%' ? 'translateX(-50%)' : undefined,
          }}
        >
          <Tooltip text={`Edge case: ${label} — long enough to wrap and test sliding`}>
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
                background: '#fff',
              }}
            >
              i
            </span>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}
