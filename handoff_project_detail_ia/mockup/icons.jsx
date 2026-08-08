/* ============ MakeItHappen — Lucide icon set ============ */
const { useState, useEffect, useRef } = React;
const _I = (paths, extra) => (props) => {
  const { size = 16, ...rest } = props || {};
  return React.createElement("svg", {
    width: size, height: size, viewBox: "0 0 24 24", fill: "none",
    stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round",
    ...rest,
  }, paths.map((d, i) => React.createElement("path", { key: i, d })),
     ...(extra || []));
};

const Icon = {
  Home: _I(["m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z", "M9 22V12h6v10"]),
  Folder: _I(["M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"]),
  Check: _I(["M20 6 9 17l-5-5"]),
  CheckCircle: (p)=>React.createElement("svg",{width:p?.size||16,height:p?.size||16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",...(p||{})},React.createElement("path",{d:"M21.801 10A10 10 0 1 1 17 3.335"}),React.createElement("path",{d:"m9 11 3 3L22 4"})),
  ListTodo: (p)=>React.createElement("svg",{width:p?.size||16,height:p?.size||16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",...(p||{})},React.createElement("rect",{x:3,y:5,width:6,height:6,rx:1}),React.createElement("path",{d:"m3 17 2 2 4-4"}),React.createElement("path",{d:"M13 6h8"}),React.createElement("path",{d:"M13 12h8"}),React.createElement("path",{d:"M13 18h8"})),
  Users: _I(["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"], [React.createElement("circle",{key:"c",cx:9,cy:7,r:4})]),
  Flame: _I(["M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"]),
  Sparkles: _I(["M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"]),
  ArrowRight: _I(["M5 12h14", "m12 5 7 7-7 7"]),
  Plus: _I(["M5 12h14", "M12 5v14"]),
  Search: _I(["m21 21-4.34-4.34"], [React.createElement("circle",{key:"c",cx:11,cy:11,r:8})]),
  Settings: _I(["M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"], [React.createElement("circle",{key:"c",cx:12,cy:12,r:3})]),
  Calendar: (p)=>React.createElement("svg",{width:p?.size||16,height:p?.size||16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",...(p||{})},React.createElement("path",{d:"M8 2v4"}),React.createElement("path",{d:"M16 2v4"}),React.createElement("rect",{x:3,y:4,width:18,height:18,rx:2}),React.createElement("path",{d:"M3 10h18"})),
  Clock: (p)=>React.createElement("svg",{width:p?.size||16,height:p?.size||16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",...(p||{})},React.createElement("circle",{cx:12,cy:12,r:10}),React.createElement("path",{d:"M12 6v6l4 2"})),
  Bell: _I(["M10.268 21a2 2 0 0 0 3.464 0", "M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326"]),
  Mail: (p)=>React.createElement("svg",{width:p?.size||16,height:p?.size||16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",...(p||{})},React.createElement("rect",{x:2,y:4,width:20,height:16,rx:2}),React.createElement("path",{d:"m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"})),
  Phone: _I(["M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"]),
  Send: _I(["M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z", "m21.854 2.147-10.94 10.939"]),
  Copy: (p)=>React.createElement("svg",{width:p?.size||16,height:p?.size||16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",...(p||{})},React.createElement("rect",{x:8,y:8,width:14,height:14,rx:2}),React.createElement("path",{d:"M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"})),
  X: _I(["M18 6 6 18", "m6 6 12 12"]),
  ChevronRight: _I(["m9 18 6-6-6-6"]),
  ChevronDown: _I(["m6 9 6 6 6-6"]),
  Flag: _I(["M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z", "M4 22v-7"]),
  Filter: _I(["M3 6h18", "M7 12h10", "M10 18h4"]),
  Star: _I(["M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.726 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.49 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"]),
  Briefcase: (p)=>React.createElement("svg",{width:p?.size||16,height:p?.size||16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",...(p||{})},React.createElement("path",{d:"M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"}),React.createElement("rect",{x:2,y:6,width:20,height:14,rx:2})),
  User: _I(["M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"], [React.createElement("circle",{key:"c",cx:12,cy:7,r:4})]),
  MapPin: _I(["M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"], [React.createElement("circle",{key:"c",cx:12,cy:10,r:3})]),
  PanelLeft: (p)=>React.createElement("svg",{width:p?.size||16,height:p?.size||16,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:2,strokeLinecap:"round",strokeLinejoin:"round",...(p||{})},React.createElement("rect",{x:3,y:3,width:18,height:18,rx:2}),React.createElement("path",{d:"M9 3v18"})),
  MoreH: _I([], [React.createElement("circle",{key:1,cx:12,cy:12,r:1}),React.createElement("circle",{key:2,cx:19,cy:12,r:1}),React.createElement("circle",{key:3,cx:5,cy:12,r:1})]),
  Link: _I(["M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71", "M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"]),
  Trophy: _I(["M6 9H4.5a2.5 2.5 0 0 1 0-5H6", "M18 9h1.5a2.5 2.5 0 0 0 0-5H18", "M4 22h16", "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22", "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22", "M18 2H6v7a6 6 0 0 0 12 0V2Z"]),
  Inbox: _I(["M22 12h-6l-2 3h-4l-2-3H2", "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"]),
  Repeat: _I(["m17 2 4 4-4 4", "M3 11v-1a4 4 0 0 1 4-4h14", "m7 22-4-4 4-4", "M21 13v1a4 4 0 0 1-4 4H3"]),
  Target: _I([], [React.createElement("circle",{key:1,cx:12,cy:12,r:10}),React.createElement("circle",{key:2,cx:12,cy:12,r:6}),React.createElement("circle",{key:3,cx:12,cy:12,r:2})]),
  Edit: _I(["M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7", "M18.375 2.625a1 1 0 0 1 3 3l-9.013 9.014a2 2 0 0 1-.853.505l-2.873.84a.5.5 0 0 1-.62-.62l.84-2.873a2 2 0 0 1 .506-.852z"]),
  CornerDown: _I(["M20 4v7a4 4 0 0 1-4 4H4", "m9 10-5 5 5 5"]),
  ArrowUpRight: _I(["M7 7h10v10", "M7 17 17 7"]),
  Hourglass: _I(["M5 22h14", "M5 2h14", "M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22", "M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"]),
};

window.Icon = Icon;
