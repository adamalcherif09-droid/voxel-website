/* ---------------------------------------------------------
   Simple line icons, drawn by hand instead of using the
   lucide-react package — that package needs a build tool
   (like Vite or webpack) to work, and this project deliberately
   has none, so the site stays a single "npm start" away from
   running with nothing else to configure.

   These won't look pixel-identical to the original icons, but
   they're the same clean, simple style and match everywhere
   they're used.
--------------------------------------------------------- */

function IconBase(props) {
  var size = props.size || 18;
  var style = props.style || {};
  var fill = props.fill || "none";
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: fill,
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, props.children);
}
function Package(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("polygon", {
    points: "12,3 21,7.5 21,16.5 12,21 3,16.5 3,7.5"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "3,7.5 12,12 21,7.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "12",
    x2: "12",
    y2: "21"
  }));
}
function Layers(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("polygon", {
    points: "12,3 21,8 12,13 3,8"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "3,12 12,17 21,12"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "3,16 12,21 21,16"
  }));
}
function UploadCloud(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("path", {
    d: "M7 18a4 4 0 01-.5-7.97A5.5 5.5 0 0117 9a4.5 4.5 0 01-.5 9H7z"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "8,13 12,9 16,13"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "9",
    x2: "12",
    y2: "19"
  }));
}
function CheckCircle2(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "9"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "8,12 11,15 16,9"
  }));
}
function ChevronLeft(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("polyline", {
    points: "15,18 9,12 15,6"
  }));
}
function ChevronUp(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("polyline", {
    points: "6,15 12,9 18,15"
  }));
}
function ChevronDown(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("polyline", {
    points: "6,9 12,15 18,9"
  }));
}
function Plus(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "5",
    x2: "12",
    y2: "19"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  }));
}
function Minus(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("line", {
    x1: "5",
    y1: "12",
    x2: "19",
    y2: "12"
  }));
}

// A cart/bag glyph used by the shop cart (drawn to match the hand-drawn
// line-icon set, not a reproduction of SHEIN's or any other logo).
function ShoppingBag(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("path", {
    d: "M6 8h12l1.2 12.2A2 2 0 0117.2 22H6.8a2 2 0 01-2-1.8L6 8z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9 10V6a3 3 0 016 0v4"
  }));
}
function Trash2(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("polyline", {
    points: "3,6 5,6 21,6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6h14z"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "10",
    y1: "11",
    x2: "10",
    y2: "17"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "14",
    y1: "11",
    x2: "14",
    y2: "17"
  }));
}
function Star(props) {
  var size = props.size || 18;
  var style = props.style || {};
  var fill = props.fill || "none";
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: fill,
    stroke: "currentColor",
    strokeWidth: "2",
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style: style
  }, /*#__PURE__*/React.createElement("polygon", {
    points: "12,2 15,9 22,9.5 16.5,14 18.5,21 12,17 5.5,21 7.5,14 2,9.5 9,9"
  }));
}
function SettingsIcon(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3.2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "8.5",
    strokeDasharray: "2 2.6"
  }));
}
function ClipboardList(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("rect", {
    x: "6",
    y: "4",
    width: "12",
    height: "17",
    rx: "2"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "9",
    y: "2",
    width: "6",
    height: "4",
    rx: "1"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "11",
    x2: "15",
    y2: "11"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "15",
    x2: "15",
    y2: "15"
  }));
}
function Lock(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("rect", {
    x: "4",
    y: "11",
    width: "16",
    height: "9",
    rx: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 11V7a4 4 0 018 0v4"
  }));
}
function Pencil(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("path", {
    d: "M12 20h9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"
  }));
}
function ImageIcon(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "18",
    height: "18",
    rx: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "8.5",
    cy: "8.5",
    r: "1.8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M21 15l-5-5-9 9"
  }));
}
function Send(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "3",
    x2: "10",
    y2: "14"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "21,3 14,21 10,14 3,10"
  }));
}
function Download(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("polyline", {
    points: "12,3 12,15"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "7,10 12,15 17,10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 19 L20 19"
  }));
}
function TypeIcon(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("polyline", {
    points: "4,6 4,4 20,4 20,6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "4",
    x2: "12",
    y2: "20"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "20",
    x2: "15",
    y2: "20"
  }));
}
function Eye(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("path", {
    d: "M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  }));
}
function EyeOff(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("path", {
    d: "M3 3l18 18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.6 5.1A10.9 10.9 0 0112 5c7 0 10.5 7 10.5 7a13.4 13.4 0 01-3.1 4.2M6.6 6.6C3.9 8.4 1.5 12 1.5 12s3.5 7 10.5 7a10.6 10.6 0 004.5-1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M9.9 9.9a3 3 0 004.2 4.2"
  }));
}
function MessageCircle(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("path", {
    d: "M21 11.5a8.4 8.4 0 01-1.1 4.3 8.5 8.5 0 01-7.4 4.2 8.4 8.4 0 01-4.3-1.1L3 21l2.1-5.2a8.4 8.4 0 01-1.1-4.3 8.5 8.5 0 014.2-7.4 8.4 8.4 0 014.3-1.1h.5a8.5 8.5 0 018 8v.5z"
  }));
}

// A generic camera-style glyph, not a reproduction of Instagram's
// actual logo (that's trademarked) — it's just there to sit next
// to the "Message on Instagram" text as a visual hint.
function Instagram(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "18",
    height: "18",
    rx: "5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "4"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "17.3",
    cy: "6.7",
    r: "0.6",
    fill: "currentColor",
    stroke: "none"
  }));
}
function X(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "6",
    x2: "6",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "6",
    x2: "18",
    y2: "18"
  }));
}
function LinkIcon(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("path", {
    d: "M9 15L15 9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M11 7l1.5-1.5a3.5 3.5 0 015 5L16 12"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M13 17l-1.5 1.5a3.5 3.5 0 01-5-5L8 12"
  }));
}
function ShareIcon(props) {
  return /*#__PURE__*/React.createElement(IconBase, props, /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "5",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "6",
    cy: "12",
    r: "3"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "18",
    cy: "19",
    r: "3"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8.6",
    y1: "10.5",
    x2: "15.4",
    y2: "6.5"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8.6",
    y1: "13.5",
    x2: "15.4",
    y2: "17.5"
  }));
}