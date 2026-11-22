export const RESPONSIVE_STYLE_RULES = `
/* ── Global overflow prevention ──────────────────────────────── */
*, *::before, *::after {
  box-sizing: border-box !important;
}
html, body, :host {
  width: 100% !important;
  max-width: 100% !important;
  overflow-x: hidden !important;
  scroll-behavior: smooth !important;
}
/* .flow-page-inner intentionally omitted — customWidth inline must win in Preview */
.flow-page-inner {
  overflow-x: hidden !important;
  scroll-behavior: smooth !important;
}
img, video, iframe, embed, object {
  max-width: 100% !important;
  height: auto !important;
}

/* ── Mobile breakpoint (≤ 767px) ─────────────────────────────── */
@media (max-width: 767px) {
  /* Do not hammer every div — overflow-x:hidden on a collapsing wrapper
     computes overflow-y to auto and clips the campaign image. */
  header, nav, section, footer, main, article, aside {
    max-width: 100% !important;
    overflow-x: hidden !important;
  }
  .tc-container, .container, [class*="container"] {
    max-width: 100% !important;
    padding-left: 16px !important;
    padding-right: 16px !important;
    overflow-x: hidden !important;
  }
  /* Grid & Flex: stack multi-column rows into single column */
  .grid, [class*="grid-cols-"], [style*="display: grid"], [style*="display:grid"] {
    grid-template-columns: 1fr !important;
  }
  /* Force text containers to never exceed screen width */
  p, h1, h2, h3, h4, h5, h6, span, a, li {
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }
  /* Clamp oversized heading font sizes on mobile */
  h1 { font-size: clamp(1.5rem, 6vw, 2.25rem) !important; line-height: 1.2 !important; }
  h2 { font-size: clamp(1.25rem, 5vw, 1.75rem) !important; line-height: 1.25 !important; }
  h3 { font-size: clamp(1.1rem, 4vw, 1.35rem) !important; line-height: 1.3 !important; }

  /* Interactive elements: ensure finger-friendly touch targets */
  button, input, select, textarea, [role="button"], a.btn, a[class*="button"], .flow-btn {
    min-height: 44px !important;
    box-sizing: border-box !important;
  }
  /* Form inputs full-width on mobile */
  input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
  select, textarea {
    width: 100% !important;
    max-width: 100% !important;
    font-size: 16px !important; /* Prevents iOS auto-zoom on focus */
  }
  /* Stacking: flex rows wrap cleanly on small screens */
  .flex:not(.no-wrap):not([class*="flex-nowrap"]),
  [style*="display: flex"]:not([style*="flex-wrap: nowrap"]),
  [style*="display:flex"]:not([style*="flex-wrap:nowrap"]) {
    flex-wrap: wrap !important;
  }
  /* Reduce padding on hero and heavy sections */
  section, .section, [data-gjs-type="wrapper"] > div {
    padding-left: 16px !important;
    padding-right: 16px !important;
  }
  /* Hide desktop-only elements */
  .desktop-only, [data-tc-device="desktop"] {
    display: none !important;
  }
  /* Mobile-first card & banner components */
  [data-tc-type="image-banner"] {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 auto !important;
    overflow: visible !important;
    height: auto !important;
  }
  [data-tc-type="image-banner"] > img {
    width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    display: block !important;
  }
  /* Buttons on images on mobile keep content width */
  button[data-tc-absolute="1"],
  a[data-tc-type="button"][data-tc-absolute="1"],
  [data-tc-absolute="1"].flow-btn,
  button.flow-btn[data-tc-absolute="1"],
  .flow-btn[data-tc-absolute="1"] {
    max-width: calc(100% - 16px) !important;
    min-height: 44px !important;
  }
}

/* ── Tablet breakpoint (768px – 1023px) ───────────────────────── */
@media (min-width: 768px) and (max-width: 1023px) {
  .tc-container, .container, [class*="container"] {
    max-width: 720px !important;
    padding-left: 24px !important;
    padding-right: 24px !important;
  }
  /* 3+ col grids drop to 2 col on tablet */
  [class*="grid-cols-3"], [class*="grid-cols-4"], [class*="grid-cols-5"], [class*="grid-cols-6"] {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }
  .mobile-only, [data-tc-device="mobile"] {
    display: none !important;
  }
  /* Section padding scaled down for tablet */
  section, .section {
    padding-left: 24px !important;
    padding-right: 24px !important;
  }
}

/* ── Desktop breakpoint (≥ 1024px) ────────────────────────────── */
@media (min-width: 1024px) {
  .mobile-only, [data-tc-device="mobile"] {
    display: none !important;
  }
  .tc-container, .container {
    max-width: 1200px;
    margin-left: auto;
    margin-right: auto;
  }
}

/* ── Print styles ─────────────────────────────────────────────── */
@media print {
  body {
    background: #fff !important;
    color: #000 !important;
  }
  header, footer, nav, [data-tc-type="hotspot"], button, .no-print {
    display: none !important;
  }
  img {
    max-width: 100% !important;
    page-break-inside: avoid !important;
  }
  section {
    padding: 48px 24px !important;
  }
}
`
