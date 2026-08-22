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
    <div className="font-mono-ac text-xs tracking-widest uppercase mb-2" style={{ color: "var(--teal)" }}>
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
      className={"inline-flex items-center justify-center gap-2 px-5 py-3 rounded-md text-sm font-medium border-0 cursor-pointer" + (props.disabled ? "" : " liquid-glass tint-brass voxel-magnetic voxel-tilt")}
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
      className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium cursor-pointer"
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
