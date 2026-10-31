import React from "react";

// One consistent icon family: 1.75px rounded strokes with a soft tinted "duotone" underlay.
// Every icon that existed before keeps its name and props, so nothing else in the app changes.
const Svg = ({ children, size = 16, sw = 1.75 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
);
// Soft fill under the line work (the "duotone" look).
const Duo = ({ d, o = 0.14, ...rest }) => <path d={d} fill="currentColor" fillOpacity={o} stroke="none" {...rest} />;

export const PlusIcon = () => <Svg><path d="M12 5v14M5 12h14" /></Svg>;
export const DownloadIcon = () => <Svg><Duo d="M5 17h14v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2z" /><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 19h14" /></Svg>;
export const UploadIcon = () => <Svg><Duo d="M5 17h14v2a1 1 0 01-1 1H6a1 1 0 01-1-1v-2z" /><path d="M12 15V4m0 0L8 8m4-4l4 4M5 19h14" /></Svg>;
export const SearchIcon = () => <Svg><circle cx="11" cy="11" r="7" fill="currentColor" fillOpacity="0.1" /><path d="M20 20l-3.5-3.5" /></Svg>;
export const ResetIcon = () => <Svg><path d="M3 12a9 9 0 109-9 9 9 0 00-6.4 2.6L3 8M3 3v5h5" /></Svg>;
export const LogoutIcon = ({ size = 17 }) => (
  <Svg size={size}>
    <Duo d="M4 5a2 2 0 012-2h3v18H6a2 2 0 01-2-2V5z" />
    <path d="M9 21H6a2 2 0 01-2-2V5a2 2 0 012-2h3" />
    <path d="M16 16.5l4.5-4.5L16 7.5" />
    <path d="M20.5 12H9.5" />
  </Svg>
);
export const LockIcon = ({ size } = {}) => <Svg size={size || 12}><rect x="5" y="11" width="14" height="9" rx="2" fill="currentColor" fillOpacity="0.14" /><path d="M8 11V8a4 4 0 118 0v3" /></Svg>;
export const EyeIcon = () => <Svg size={15}><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" /><circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" /></Svg>;
export const EyeOffIcon = () => <Svg size={15}><path d="M17.94 17.94A10.94 10.94 0 0112 19c-7 0-11-7-11-7a20.3 20.3 0 015.06-5.94M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 7 11 7a20.3 20.3 0 01-3.22 4.11M14.12 14.12a3 3 0 11-4.24-4.24" /><path d="M1 1l22 22" /></Svg>;
export const CalendarIcon = () => <Svg size={15}><rect x="3" y="5" width="18" height="16" rx="2.5" fill="currentColor" fillOpacity="0.12" /><path d="M3 10h18M8 3v4M16 3v4" /></Svg>;
export const UserIcon = ({ size } = {}) => <Svg size={size || 15}><circle cx="12" cy="8" r="4" fill="currentColor" fillOpacity="0.14" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Svg>;
export const UsersIcon = ({ size } = {}) => <Svg size={size || 16}><circle cx="9" cy="8" r="3.5" fill="currentColor" fillOpacity="0.14" /><path d="M2 20c0-3.5 3-6 7-6s7 2.5 7 6" /><path d="M16 4.5a3.5 3.5 0 010 7M18 14.2c2.4.6 4 2.4 4 5.8" /></Svg>;
export const EditIcon = () => <Svg size={15}><Duo d="M4 20h4L19 9l-4-4L4 16v4z" /><path d="M4 20h4L19 9a2.1 2.1 0 00-4-4L4 16v4z" /><path d="M13.5 6.5l4 4" /></Svg>;
export const TrashIcon = () => <Svg size={15}><Duo d="M6 7h12l-1 12a2 2 0 01-2 2H9a2 2 0 01-2-2L6 7z" /><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3" /></Svg>;
export const CopyIcon = () => <Svg size={14}><rect x="9" y="9" width="11" height="11" rx="2" fill="currentColor" fillOpacity="0.12" /><path d="M5 15V6a2 2 0 012-2h9" /></Svg>;
export const AlertIcon = () => <Svg size={16}><circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.12" /><path d="M12 7.5v5M12 16h.01" /></Svg>;
export const KeyIcon = () => <Svg size={15}><circle cx="8" cy="15" r="4" fill="currentColor" fillOpacity="0.14" /><path d="M11 12l9-9M16 7l3 3M14 9l2 2" /></Svg>;
export const PowerIcon = ({ size = 15 } = {}) => <Svg size={size}><path d="M12 3v9M6.3 6.5a8 8 0 1011.4 0" /></Svg>;
export const SparkIcon = () => <Svg size={14}><Duo d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" o="0.2" /><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /></Svg>;
export const FilterIcon = () => <Svg size={17}><Duo d="M3 5h18l-7 8v6l-4 2v-8L3 5z" /><path d="M3 5h18l-7 8v6l-4 2v-8L3 5z" /></Svg>;

// ---- New icons used by the upgraded navbar, menus and widgets ----
export const SunIcon = ({ size = 18 } = {}) => <Svg size={size}><circle cx="12" cy="12" r="4" fill="currentColor" fillOpacity="0.18" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>;
export const MoonIcon = ({ size = 18 } = {}) => <Svg size={size}><Duo d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" o="0.18" /><path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" /></Svg>;
export const ChevronDownIcon = ({ size = 14 } = {}) => <Svg size={size} sw={2.2}><path d="M6 9l6 6 6-6" /></Svg>;
export const CheckIcon = ({ size = 16 } = {}) => <Svg size={size} sw={2.6}><path d="M5 12.5l4.5 4.5L19 7.5" /></Svg>;
export const ClockIcon = ({ size = 16 } = {}) => <Svg size={size}><circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.12" /><path d="M12 7v5l3 2" /></Svg>;
export const ShieldIcon = ({ size = 16 } = {}) => <Svg size={size}><Duo d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" /><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6l8-3z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></Svg>;
export const ArrowUpIcon = ({ size = 18 } = {}) => <Svg size={size} sw={2.2}><path d="M12 19V5M6 11l6-6 6 6" /></Svg>;
export const WifiOffIcon = ({ size = 16 } = {}) => <Svg size={size}><path d="M2 8.8a15 15 0 0112.6-3.4M5 12.5a10 10 0 014.4-2.6M8.5 16a5 5 0 013-1.3M12 20h.01M3 3l18 18" /></Svg>;
export const TargetIcon = ({ size = 16 } = {}) => <Svg size={size}><circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity="0.1" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /></Svg>;
export const SettingsIcon = ({ size = 16 } = {}) => <Svg size={size}><circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.16" /><path d="M19.4 15a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 01-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 010-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H9a1.7 1.7 0 001-1.5V3a2 2 0 014 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V9a1.7 1.7 0 001.5 1H21a2 2 0 010 4h-.1a1.7 1.7 0 00-1.5 1z" /></Svg>;

// ---- Bottom navigation icons (phones). `active` thickens the line and deepens the tint. ----
const NavSvg = ({ children, active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.7} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" data-active={active ? "true" : "false"}>
    {children}
  </svg>
);
const tint = (active) => (active ? 0.26 : 0.1);
export const NavDashboardIcon = ({ active }) => (
  <NavSvg active={active}>
    <rect x="3" y="3" width="8" height="10" rx="2.2" fill="currentColor" fillOpacity={tint(active)} />
    <rect x="13" y="3" width="8" height="6" rx="2.2" />
    <rect x="13" y="11" width="8" height="10" rx="2.2" fill="currentColor" fillOpacity={tint(active)} />
    <rect x="3" y="15" width="8" height="6" rx="2.2" />
  </NavSvg>
);
export const NavRecordsIcon = ({ active }) => (
  <NavSvg active={active}>
    <rect x="4" y="4" width="16" height="17" rx="2.8" fill="currentColor" fillOpacity={tint(active)} />
    <path d="M9 4V3.5A1.5 1.5 0 0110.5 2h3A1.5 1.5 0 0115 3.5V4" />
    <path d="M8 11h8M8 15h8M8 18h4" />
  </NavSvg>
);
export const NavAccountsIcon = ({ active }) => (
  <NavSvg active={active}>
    <circle cx="9" cy="8" r="3.5" fill="currentColor" fillOpacity={tint(active)} />
    <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
    <path d="M16 4.6a3.5 3.5 0 010 6.8M18.5 14.4c1.9.8 3 2.6 3 5.6" />
  </NavSvg>
);
export const NavSessionsIcon = ({ active }) => (
  <NavSvg active={active}>
    <rect x="3" y="5" width="18" height="16" rx="2.8" fill="currentColor" fillOpacity={tint(active)} />
    <path d="M3 10h18M8 3v4M16 3v4" />
    <circle cx="12" cy="15.5" r="2.5" />
    <path d="M12 14.5v1.2l.8.5" />
  </NavSvg>
);
export const NavAddIcon = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
export const NavUploadIcon = ({ active }) => (
  <NavSvg active={active}>
    <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    <path d="M12 16V4M7.5 8.5L12 4l4.5 4.5" />
  </NavSvg>
);
export const NavExportIcon = ({ active }) => (
  <NavSvg active={active}>
    <path d="M4 15v3a2 2 0 002 2h12a2 2 0 002-2v-3" />
    <path d="M12 4v12M7.5 11.5L12 16l4.5-4.5" />
  </NavSvg>
);
