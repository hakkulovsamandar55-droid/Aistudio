/**
 * The app's icon set — every glyph is drawn here as SVG geometry.
 *
 * No emoji anywhere in the product: emoji render differently on every
 * platform (and look like stickers), so the interface would never be the
 * same twice. These are stroked paths on a shared 24x24 grid that inherit
 * `currentColor` and the surrounding font size, which keeps them aligned
 * with text and correctly coloured in every state.
 */

const BASE = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

const SIZES = { xs: 14, sm: 16, md: 20, lg: 24, xl: 32, '2xl': 44 };

/** Every path is authored inside the same 24x24 box so weights stay even. */
const PATHS = {
  // --- navigation -------------------------------------------------------
  home: (
    <>
      <path d="M4 10.2 12 4l8 6.2V19a1.4 1.4 0 0 1-1.4 1.4h-3.3v-5.3H8.7v5.3H5.4A1.4 1.4 0 0 1 4 19Z" />
    </>
  ),
  create: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="5.2" />
      <path d="M12 8.3v7.4M8.3 12h7.4" />
    </>
  ),
  library: (
    <>
      <rect x="3.4" y="4.6" width="7" height="7" rx="1.7" />
      <rect x="13.6" y="4.6" width="7" height="7" rx="1.7" />
      <rect x="3.4" y="14.4" width="7" height="5" rx="1.7" />
      <rect x="13.6" y="14.4" width="7" height="5" rx="1.7" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8.4" r="3.6" />
      <path d="M4.8 20a7.4 7.4 0 0 1 14.4 0" />
    </>
  ),

  // --- creation modules -------------------------------------------------
  magic: (
    <>
      <path d="M12 3.2c.6 3.3 1.7 4.4 5 5-3.3.6-4.4 1.7-5 5-.6-3.3-1.7-4.4-5-5 3.3-.6 4.4-1.7 5-5Z" />
      <path d="M18.6 14.4c.28 1.5.79 2 2.3 2.3-1.51.28-2.02.79-2.3 2.3-.28-1.51-.79-2.02-2.3-2.3 1.51-.3 2.02-.8 2.3-2.3Z" />
      <path d="M6 15.4c.2 1.1.57 1.45 1.66 1.66-1.09.2-1.46.57-1.66 1.66-.2-1.09-.57-1.46-1.66-1.66C5.43 16.85 5.8 16.5 6 15.4Z" />
    </>
  ),
  image: (
    <>
      <rect x="3.4" y="4.8" width="17.2" height="14.4" rx="2.4" />
      <circle cx="8.9" cy="9.8" r="1.5" />
      <path d="m3.9 16.6 4.3-4a1.9 1.9 0 0 1 2.6 0l3.4 3.2M13.3 14.1l1.7-1.6a1.9 1.9 0 0 1 2.6 0l2.5 2.3" />
    </>
  ),
  video: (
    <>
      <rect x="2.8" y="6" width="13.2" height="12" rx="2.4" />
      <path d="m16 11 3.9-2.6a.9.9 0 0 1 1.4.75v5.7a.9.9 0 0 1-1.4.75L16 13Z" />
    </>
  ),
  voice: (
    <>
      <rect x="9" y="2.8" width="6" height="10.4" rx="3" />
      <path d="M5.6 11.2a6.4 6.4 0 0 0 12.8 0M12 17.6v3.6M9 21.2h6" />
    </>
  ),
  music: (
    <>
      <path d="M9 17.4V5.6l10-1.9v11.7" />
      <circle cx="6.6" cy="17.6" r="2.6" />
      <circle cx="16.6" cy="15.6" r="2.6" />
    </>
  ),
  script: (
    <>
      <path d="M6.2 3.4h8.3l4.3 4.3v12.9a1.6 1.6 0 0 1-1.6 1.6H6.2a1.6 1.6 0 0 1-1.6-1.6V5a1.6 1.6 0 0 1 1.6-1.6Z" />
      <path d="M14.2 3.6v4.2h4.2M8.4 12.6h7M8.4 16.4h4.6" />
    </>
  ),
  remix: (
    <>
      <path d="M3.6 6.6h3.1c1.2 0 2.3.6 3 1.6l4.6 7c.7 1 1.8 1.6 3 1.6h3.1" />
      <path d="M3.6 17.4h3.1c1.2 0 2.3-.6 3-1.6l.9-1.4M14.3 9.4l.9-1.4c.7-1 1.8-1.6 3-1.6h3.1" />
      <path d="m18.2 3.8 2.6 2.8-2.6 2.8M18.2 14.6l2.6 2.8-2.6 2.8" />
    </>
  ),

  // --- content / discovery ---------------------------------------------
  gallery: (
    <>
      <rect x="7" y="3.4" width="13.6" height="13.6" rx="2.4" />
      <path d="M17 20.6H6a2.6 2.6 0 0 1-2.6-2.6V7" />
      <circle cx="11.6" cy="8.2" r="1.4" />
      <path d="m7.4 15 3.2-3a1.8 1.8 0 0 1 2.5 0l4.2 4" />
    </>
  ),
  projects: (
    <>
      <path d="M3.4 7.2A2.2 2.2 0 0 1 5.6 5h3.1l2 2.4h7.7a2.2 2.2 0 0 1 2.2 2.2v7.2a2.2 2.2 0 0 1-2.2 2.2H5.6a2.2 2.2 0 0 1-2.2-2.2Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.2V12l3.2 2" />
    </>
  ),

  // --- actions ----------------------------------------------------------
  download: (
    <>
      <path d="M12 3.8v11M7.8 10.6 12 14.8l4.2-4.2" />
      <path d="M4.6 16.4v2.2a1.8 1.8 0 0 0 1.8 1.8h11.2a1.8 1.8 0 0 0 1.8-1.8v-2.2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 15.6V4.4M7.8 8.6 12 4.4l4.2 4.2" />
      <path d="M4.6 16.4v2.2a1.8 1.8 0 0 0 1.8 1.8h11.2a1.8 1.8 0 0 0 1.8-1.8v-2.2" />
    </>
  ),
  trash: (
    <>
      <path d="M4.8 6.6h14.4M9.4 6.4V4.9a1.3 1.3 0 0 1 1.3-1.3h2.6a1.3 1.3 0 0 1 1.3 1.3v1.5" />
      <path d="M6.6 6.6l.8 12.1a1.7 1.7 0 0 0 1.7 1.6h5.8a1.7 1.7 0 0 0 1.7-1.6l.8-12.1" />
      <path d="M10.4 10.4v6M13.6 10.4v6" />
    </>
  ),
  star: (
    <>
      <path d="m12 3.9 2.62 5.3 5.85.86-4.23 4.13 1 5.82L12 17.26l-5.24 2.75 1-5.82-4.23-4.13 5.85-.85Z" />
    </>
  ),
  starFilled: (
    <>
      <path
        d="m12 3.9 2.62 5.3 5.85.86-4.23 4.13 1 5.82L12 17.26l-5.24 2.75 1-5.82-4.23-4.13 5.85-.85Z"
        fill="currentColor"
      />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.4c2.1 2.3 3.3 5.4 3.3 8.6s-1.2 6.3-3.3 8.6c-2.1-2.3-3.3-5.4-3.3-8.6S9.9 5.7 12 3.4Z" />
    </>
  ),
  lock: (
    <>
      <rect x="4.8" y="10.2" width="14.4" height="10" rx="2.2" />
      <path d="M8.2 10V7.6a3.8 3.8 0 0 1 7.6 0V10" />
      <path d="M12 14v2.6" />
    </>
  ),
  plus: <path d="M12 5.2v13.6M5.2 12h13.6" />,
  minus: <path d="M5.2 12h13.6" />,
  check: <path d="m4.8 12.6 4.6 4.6 9.8-10" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  chevronRight: <path d="m9.4 5.4 6.6 6.6-6.6 6.6" />,
  chevronLeft: <path d="M14.6 5.4 8 12l6.6 6.6" />,
  chevronDown: <path d="m5.4 9.4 6.6 6.6 6.6-6.6" />,
  arrowRight: <path d="M4.2 12h15.2M13.4 6l6 6-6 6" />,
  arrowLeft: <path d="M19.8 12H4.6M10.6 6l-6 6 6 6" />,
  copy: (
    <>
      <rect x="8.4" y="8.4" width="11.2" height="11.2" rx="2.2" />
      <path d="M15.6 8.2V6.6a2.2 2.2 0 0 0-2.2-2.2H6.6a2.2 2.2 0 0 0-2.2 2.2v6.8a2.2 2.2 0 0 0 2.2 2.2h1.6" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.4" />
      <path d="m15.6 15.6 4.2 4.2" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 11.4a8 8 0 1 0-.5 4.2" />
      <path d="M20.4 5.6v5.8h-5.8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M18.9 14.5a1.5 1.5 0 0 0 .3 1.7l.1.1a1.9 1.9 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.5 1v.3a1.9 1.9 0 1 1-3.7 0v-.2a1.5 1.5 0 0 0-2.6-1l-.1.1a1.9 1.9 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1-2.5H3.9a1.9 1.9 0 1 1 0-3.7h.2a1.5 1.5 0 0 0 1-2.6l-.1-.1a1.9 1.9 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 1.7.3h.1a1.5 1.5 0 0 0 .9-1.4V3.9a1.9 1.9 0 1 1 3.7 0v.2a1.5 1.5 0 0 0 2.5 1l.1-.1a1.9 1.9 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1 2.5h.3a1.9 1.9 0 1 1 0 3.7h-.2a1.5 1.5 0 0 0-1.4.9Z" />
    </>
  ),
  logout: (
    <>
      <path d="M9.4 20.2H6a2 2 0 0 1-2-2V5.8a2 2 0 0 1 2-2h3.4" />
      <path d="M15.4 16.2 19.6 12l-4.2-4.2M19.2 12H9" />
    </>
  ),
  edit: (
    <>
      <path d="M12.6 5.4H6a2 2 0 0 0-2 2v10.4a2 2 0 0 0 2 2h10.4a2 2 0 0 0 2-2v-6.6" />
      <path d="M17 3.9a2 2 0 0 1 2.9 2.8l-7.7 7.7-3.6.8.8-3.6Z" />
    </>
  ),
  play: <path d="M8.4 5.6 18.6 12 8.4 18.4Z" />,
  eye: (
    <>
      <path d="M2.6 12S6 5.8 12 5.8 21.4 12 21.4 12 18 18.2 12 18.2 2.6 12 2.6 12Z" />
      <circle cx="12" cy="12" r="2.9" />
    </>
  ),

  // --- money / account --------------------------------------------------
  credit: (
    <>
      <path d="M12 3.2 20.4 12 12 20.8 3.6 12Z" />
      <path d="M7.6 12h8.8" />
    </>
  ),
  card: (
    <>
      <rect x="2.8" y="5.4" width="18.4" height="13.2" rx="2.4" />
      <path d="M2.8 9.8h18.4M6.6 14.6h3.4" />
    </>
  ),
  gift: (
    <>
      <rect x="3.4" y="9.4" width="17.2" height="4.2" rx="1.2" />
      <path d="M4.9 13.6v5.2a1.6 1.6 0 0 0 1.6 1.6h11a1.6 1.6 0 0 0 1.6-1.6v-5.2M12 9.4v11" />
      <path d="M12 9.4H8.1a2.35 2.35 0 1 1 0-4.7C10.6 4.7 12 9.4 12 9.4ZM12 9.4h3.9a2.35 2.35 0 1 0 0-4.7C13.4 4.7 12 9.4 12 9.4Z" />
    </>
  ),
  users: (
    <>
      <circle cx="9.4" cy="8.4" r="3.4" />
      <path d="M3.6 19.4a5.9 5.9 0 0 1 11.6 0" />
      <path d="M16.2 5.4a3.4 3.4 0 0 1 0 6.4M17.4 14.2a5.7 5.7 0 0 1 3 5.2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.4 19.4 6v5.5c0 4.2-3 7.6-7.4 9.1-4.4-1.5-7.4-4.9-7.4-9.1V6Z" />
      <path d="m9 12 2.2 2.2 4-4.2" />
    </>
  ),
  chart: (
    <>
      <path d="M4 20h16" />
      <path d="M6.6 20v-6.4M11 20V8.2M15.4 20v-4.4M19.8 20V4.6" />
    </>
  ),
  key: (
    <>
      <circle cx="8.2" cy="8.2" r="4.4" />
      <path d="m11.4 11.4 8.2 8.2M16.4 16.4l2-2M14 14l1.6-1.6" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 9.4v4.2a1.8 1.8 0 0 0 1.8 1.8h1.9l8.9 4.4V5L7.7 9.4Z" />
      <path d="M19.2 9.2a3.6 3.6 0 0 1 0 5.6M7.7 15.4v3.2a1.6 1.6 0 0 0 1.6 1.6h1" />
    </>
  ),
  alert: (
    <>
      <path d="M12 4.4 21 19.6H3Z" />
      <path d="M12 10v3.6M12 16.6v.1" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 11.2v5M12 7.9v.1" />
    </>
  ),
  package: (
    <>
      <path d="M20.4 8.2v7.6a1.7 1.7 0 0 1-.9 1.5l-6.7 3.6a1.7 1.7 0 0 1-1.6 0l-6.7-3.6a1.7 1.7 0 0 1-.9-1.5V8.2a1.7 1.7 0 0 1 .9-1.5l6.7-3.6a1.7 1.7 0 0 1 1.6 0l6.7 3.6a1.7 1.7 0 0 1 .9 1.5Z" />
      <path d="m3.8 7.4 8.2 4.4 8.2-4.4M12 20.6v-8.8" />
    </>
  ),

  // --- style presets ----------------------------------------------------
  camera: (
    <>
      <path d="M3.4 8.8a1.8 1.8 0 0 1 1.8-1.8h2.1l1.4-2.2h6.6l1.4 2.2h2.1a1.8 1.8 0 0 1 1.8 1.8v8.6a1.8 1.8 0 0 1-1.8 1.8H5.2a1.8 1.8 0 0 1-1.8-1.8Z" />
      <circle cx="12" cy="12.8" r="3.5" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3.4a8.6 8.6 0 0 0 0 17.2c1 0 1.7-.8 1.7-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.7-1.7h2a5.2 5.2 0 0 0 5.2-5.2c0-3.9-4.3-6.2-9.6-6.2Z" />
      <circle cx="8.1" cy="9.3" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="12" cy="7.3" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="15.9" cy="9.3" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="7.5" cy="13.6" r="1.05" fill="currentColor" stroke="none" />
    </>
  ),
  cube: (
    <>
      <path d="M12 3.2 20.2 7.6v8.8L12 20.8 3.8 16.4V7.6Z" />
      <path d="M3.9 7.7 12 12l8.1-4.3M12 12v8.7" />
    </>
  ),
  frame: (
    <>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="1.8" />
      <rect x="7.4" y="7.4" width="9.2" height="9.2" rx="1" />
    </>
  ),
  moon: (
    <>
      <path d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.6 8.6 0 1 0 10.4 10.4Z" />
    </>
  ),
  square: <rect x="4.6" y="4.6" width="14.8" height="14.8" rx="2" />,
  droplet: (
    <>
      <path d="M12 3.4c3.1 3.4 6.2 6.4 6.2 9.6a6.2 6.2 0 1 1-12.4 0c0-3.2 3.1-6.2 6.2-9.6Z" />
    </>
  ),
  clapper: (
    <>
      <path d="M3.4 9.6h17.2v8.8a2 2 0 0 1-2 2H5.4a2 2 0 0 1-2-2Z" />
      <path d="M3.7 9.5 5 5.1l14.3 1.5-.8 3" />
      <path d="m8.6 5.5-1.2 4M13.3 6l-1.2 3.6" />
    </>
  ),
  filmReel: (
    <>
      <rect x="3.4" y="4.6" width="17.2" height="14.8" rx="2.2" />
      <path d="M8 4.8v14.4M16 4.8v14.4M3.6 12h16.8M3.6 8.4h4.2M3.6 15.6h4.2M16.2 8.4h4.2M16.2 15.6h4.2" />
    </>
  ),
  smile: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M8.6 14.2a4.3 4.3 0 0 0 6.8 0" />
      <path d="M9.3 9.6v.1M14.7 9.6v.1" />
    </>
  ),
  stopwatch: (
    <>
      <circle cx="12" cy="13.4" r="7.2" />
      <path d="M12 10v3.4l2.2 1.4M9.6 2.8h4.8M19 8l1.4-1.4M17.4 6.2 19 8" />
    </>
  ),
  drone: (
    <>
      <rect x="9" y="9" width="6" height="6" rx="1.6" />
      <circle cx="5.2" cy="5.2" r="2.3" />
      <circle cx="18.8" cy="5.2" r="2.3" />
      <circle cx="5.2" cy="18.8" r="2.3" />
      <circle cx="18.8" cy="18.8" r="2.3" />
      <path d="m6.9 6.9 2.4 2.4M17.1 6.9l-2.4 2.4M6.9 17.1l2.4-2.4M17.1 17.1l-2.4-2.4" />
    </>
  ),
  sparkle: (
    <>
      <path d="M12 3.4c.75 4.05 2.15 5.45 6.2 6.2-4.05.75-5.45 2.15-6.2 6.2-.75-4.05-2.15-5.45-6.2-6.2 4.05-.75 5.45-2.15 6.2-6.2Z" />
      <path d="M17.8 16.4c.24 1.3.68 1.74 1.98 1.98-1.3.24-1.74.68-1.98 1.98-.24-1.3-.68-1.74-1.98-1.98 1.3-.26 1.74-.7 1.98-1.98Z" />
    </>
  ),
  wave: (
    <>
      <path d="M3.4 12h2.2l1.9-6 2.6 12 2.6-9.6L15 15l1.6-3h4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <circle cx="12" cy="12" r="4.6" />
      <circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3.4 8.6 4.6L12 12.6 3.4 8Z" />
      <path d="m3.4 12.4 8.6 4.6 8.6-4.6M3.4 16.6l8.6 4.6 8.6-4.6" />
    </>
  ),
  mail: (
    <>
      <rect x="3.4" y="5.4" width="17.2" height="13.2" rx="2.2" />
      <path d="m3.8 7.2 7.2 5.2a1.7 1.7 0 0 0 2 0l7.2-5.2" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
};

/**
 * @param {{ name: keyof PATHS, size?: keyof SIZES | number, className?: string }} props
 */
export function Icon({ name, size = 'md', className, strokeWidth, ...props }) {
  const glyph = PATHS[name];
  if (!glyph) return null;

  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.md;

  return (
    <svg
      {...BASE}
      strokeWidth={strokeWidth || BASE.strokeWidth}
      width={px}
      height={px}
      className={className}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {glyph}
    </svg>
  );
}

/** Icon keys the backend may send (module/style config), so lookups never miss. */
export const ICON_NAMES = Object.keys(PATHS);

export default Icon;
