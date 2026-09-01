function BrandMark(props) {
  var size = (props && props.size) || 26;
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect className="voxel-mark-bar voxel-mark-1" x="4" y="22" width="24" height="4" rx="1.5" fill="var(--brass)" />
      <rect className="voxel-mark-bar voxel-mark-2" x="8" y="15" width="16" height="4" rx="1.5" fill="var(--brass)" opacity="0.78" />
      <rect className="voxel-mark-bar voxel-mark-3" x="12" y="8" width="8" height="4" rx="1.5" fill="var(--brass)" opacity="0.55" />
    </svg>
  );
}

function ShapeIcon(props) {
  var shape = props.shape;
  var size = props.size || 20;
  var color = "var(--ink-dim)";
  var common = { width: size, height: size, viewBox: "0 0 20 20", fill: "none", stroke: color, strokeWidth: "2" };
  if (shape === "circle") return <svg {...common}><circle cx="10" cy="10" r="8" /></svg>;
  if (shape === "square") return <svg {...common}><rect x="3" y="3" width="14" height="14" /></svg>;
  if (shape === "triangle") return <svg {...common}><polygon points="10,3 17,17 3,17" /></svg>;
  if (shape === "diamond") return <svg {...common}><polygon points="10,2 18,10 10,18 2,10" /></svg>;
  if (shape === "star") return <svg {...common} strokeWidth="1.5"><polygon points="10,2 12.5,7.5 18,8 13.5,11.7 15,17.5 10,14.2 5,17.5 6.5,11.7 2,8 7.5,7.5" /></svg>;
  if (shape === "hexagon") return <svg {...common}><polygon points="6,3 14,3 18,10 14,17 6,17 2,10" /></svg>;
  return null;
}

function Eyebrow(props) {
  return (
    <div className="voxel-eyebrow font-mono-ac text-xs tracking-widest uppercase mb-2" style={{ color: "var(--teal)" }}>
      {props.children}
    </div>
  );
}

function EmptyState(props) {
  var Icon = props.icon;
  return (
    <div className="flex flex-col items-center text-center py-16 px-6 rounded-lg" style={{ border: "1px dashed var(--line)" }}>
      <Icon size={28} style={{ color: "var(--ink-dim)" }} />
      <div className="font-display text-lg mt-4" style={{ color: "var(--ink)" }}>{props.title}</div>
      <p className="text-sm mt-1 max-w-xs" style={{ color: "var(--ink-dim)" }}>{props.body}</p>
    </div>
  );
}

function PrimaryButton(props) {
  var Icon = props.icon;
  var type = props.type || "button";
  return (
    <button
      type={type}
      onClick={props.onClick}
      disabled={props.disabled}
      className={"inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-medium border-0 cursor-pointer" + (props.disabled ? "" : " liquid-glass tint-brass voxel-magnetic voxel-tilt") + (props.className ? " " + props.className : "")}
      style={{
        background: props.disabled ? "var(--line)" : undefined,
        color: props.disabled ? "var(--ink-dim)" : "#161618",
        opacity: props.disabled ? 0.7 : 1,
      }}
    >
      {Icon && <Icon size={16} />}
      {props.children}
    </button>
  );
}

function SecondaryButton(props) {
  var Icon = props.icon;
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      className={"inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium cursor-pointer" + (props.className ? " " + props.className : "")}
      style={{ background: "transparent", color: props.disabled ? "var(--ink-dim)" : "var(--ink)", border: "1px solid var(--line)", opacity: props.disabled ? 0.6 : 1 }}
    >
      {Icon && <Icon size={16} />}
      {props.children}
    </button>
  );
}

function SkeletonBlock(props) {
  var radius = props.radius === undefined ? 8 : props.radius;
  return <div className="skeleton-shimmer" style={Object.assign({ width: props.width, height: props.height, borderRadius: radius, flexShrink: 0 }, props.style)} />;
}

function SkeletonScreen() {
  return (
    <div className="voxel-root">
      <header style={{ borderBottom: "1px solid var(--line)" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-4">
          <div className="flex items-center gap-3">
            <SkeletonBlock width={60} height={60} radius={10} />
            <SkeletonBlock width={90} height={22} radius={4} />
          </div>
          <SkeletonBlock width={120} height={40} radius={8} />
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 sm:px-8">
        <section className="pt-14 sm:pt-20 pb-10">
          <SkeletonBlock width={190} height={13} radius={4} style={{ marginBottom: 18 }} />
          <SkeletonBlock width="65%" height={38} radius={6} style={{ marginBottom: 10, maxWidth: 420 }} />
          <SkeletonBlock width="45%" height={38} radius={6} style={{ marginBottom: 22, maxWidth: 300 }} />
          <SkeletonBlock width="85%" height={15} radius={4} style={{ marginBottom: 8, maxWidth: 520 }} />
          <SkeletonBlock width="55%" height={15} radius={4} style={{ maxWidth: 340 }} />
        </section>

        <section className="pb-14">
          <SkeletonBlock width={100} height={13} radius={4} style={{ marginBottom: 16 }} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map(function (_, i) {
              return (
                <div key={i} className="p-5 rounded-lg" style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                  <SkeletonBlock width={18} height={18} radius={4} style={{ marginBottom: 14 }} />
                  <SkeletonBlock width="75%" height={15} radius={4} style={{ marginBottom: 8 }} />
                  <SkeletonBlock width="45%" height={11} radius={4} />
                </div>
              );
            })}
          </div>
        </section>

        <section className="pb-16">
          <SkeletonBlock width="100%" height={110} radius={12} />
        </section>
      </div>
    </div>
  );
}

// Error boundary — if ANY component ever throws during render, React
// unmounts the whole tree and the visitor sees a blank white page.
// This catches the crash at the top, keeps the site's look, and offers
// a one-click recovery instead of a dead screen.
// NOTE: declared via a `var` (a class EXPRESSION) rather than a bare
// `class` declaration — the site compiles JSX on the fly and runs each
// file through an indirect eval, where top-level `let`/`const`/`class`
// bindings don't leak into the global scope. A `var` does, exactly like
// the rest of these files' `function` components, so app.js can reach
// this component reliably.
var ErrorBoundary = class extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error, info) {
    // Detail goes to the console for debugging; the visitor only sees
    // the friendly recovery screen below.
    console.error("UI crash caught by error boundary:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="voxel-root">
          <div className="max-w-md mx-auto px-6 py-24 text-center">
            <div className="font-display text-xl" style={{ color: "var(--ink)" }}>Something glitched on the page</div>
            <p className="text-sm mt-3" style={{ color: "var(--ink-dim)" }}>
              Don't worry — your cart and the shop's data are safe. Reloading the page fixes this almost every time.
            </p>
            <div className="mt-6">
              <PrimaryButton onClick={function () { window.location.reload(); }}>Reload the page</PrimaryButton>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
};

/* The seasonal greeting: when the site loads under a themed look, a
   fixed overlay animates the theme's "Happy <holiday>" into view letter
   by letter, while a small cascade of the theme's own emojis bursts off
   the word like fireworks. It then fades itself out (~3s) and unmounts,
   so it never blocks the shop. The default look shows nothing.
   Rendered lazily by app.js so it only exists while it has something to
   say; onDone lets the parent drop the component once it's finished. */
function ThemeGreeting(props) {
  var theme = props.theme;
  var onDone = props.onDone || function () {};
  var g = getThemeGreeting(theme);
  var _vis = React.useState(true); var visible = _vis[0]; var setVisible = _vis[1];
  var _parts = React.useState([]); var parts = _parts[0]; var setParts = _parts[1];
  var _gone = React.useState(false); var gone = _gone[0]; var setGone = _gone[1];
  var spawnRef = React.useRef(null);
  var cleanupRef = React.useRef(null);

  React.useEffect(function () {
    if (!g) return;

    // Word letters reveal themselves via CSS (staggered animation); the
    // firework below is the emoji cascade bursting off the word.
    var start = Date.now();
    var spawn = function () {
      var emojis = g.emojis;
      var next = [];
      // 2-3 fresh particles per tick, each aimed at its own angle so the
      // burst fans out full-circle around the greeting. Each one pops out,
      // arcs (curves) through a midpoint, then falls away — like a firework.
      var n = 2 + Math.floor(Math.random() * 2);
      for (var i = 0; i < n; i++) {
        var angle = Math.random() * Math.PI * 2;
        var dist = 80 + Math.random() * 200;
        var dx = Math.cos(angle) * dist;
        var dy = Math.sin(angle) * dist;
        // Arc midpoint bows up over the straight line so the emoji curves
        // outward instead of gliding in a straight line (firework gravity).
        var arcH = 30 + Math.random() * 70;
        next.push({
          id: start + "-" + parts.length + "-" + i + "-" + Math.random(),
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          dx: Math.round(dx),
          dy: Math.round(dy),
          mx: Math.round(dx * 0.5),
          my: Math.round(dy * 0.5 - arcH),
          rot: Math.round((Math.random() * 180 - 90)),
          size: 16 + Math.round(Math.random() * 18),
          lifespan: 800 + Math.round(Math.random() * 350),
        });
      }
      setParts(function (old) { return old.concat(next); });
    };

    spawnRef.current = setInterval(spawn, 90);
    cleanupRef.current = setTimeout(function () {
      clearInterval(spawnRef.current);
      // Let the last burst finish, then fade the greeting out.
      setTimeout(function () {
        clearInterval(spawnRef.current);
        setVisible(false);
        setTimeout(function () {
          setGone(true);
          onDone();
        }, 520);
      }, 700);
    }, 1700);
    return function () {
      if (spawnRef.current) clearInterval(spawnRef.current);
      if (cleanupRef.current) clearTimeout(cleanupRef.current);
    };
  }, []);

  if (!g || gone) return null;

  // Split into words, then letters, so spaces are preserved and each
  // letter animates in with its own tiny delay.
  var words = g.text.split(" ");
  var letterIdx = 0;
  var letters = words.map(function (word, wi) {
    var spans = word.split("").map(function (ch) {
      return (
        <span
          key={"l" + letterIdx}
          style={{ animationDelay: (0.08 + letterIdx * 0.055) + "s" }}
        >{ch}</span>
      );
    });
    return (
      <span key={"w" + wi} style={{ whiteSpace: "pre" }}>{spans}{wi < words.length - 1 ? <span style={{ display: "inline-block", width: "0.32em" }}>&nbsp;</span> : null}</span>
    );
  });

  return (
    <div className={"voxel-greeting-overlay" + (visible ? "" : " voxel-greeting-exit")} role="presentation" aria-hidden="true">
      <div className="voxel-greeting-inner">
        {parts.map(function (p) {
          return (
            <span
              key={p.id}
              className="voxel-greeting-particle"
              style={{
                "--dx": p.dx + "px",
                "--dy": p.dy + "px",
                "--mx": p.mx + "px",
                "--my": p.my + "px",
                "--rot": p.rot + "deg",
                fontSize: p.size + "px",
                animationDuration: p.lifespan + "ms",
              }}
            >{p.emoji}</span>
          );
        })}
        <div className="voxel-greeting-word">{letters}</div>
      </div>
    </div>
  );
}
