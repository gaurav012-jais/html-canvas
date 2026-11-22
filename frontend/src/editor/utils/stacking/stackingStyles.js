export const Z_IMAGE = 1
export const Z_OVERLAY = 40
export const Z_HOTSPOT = 50

/**
 * Editor canvas CSS — stacking only, NO position:!important
 */
export const OVERLAY_STACKING_CANVAS_CSS = `
  [data-tc-type="image-banner"] {
    position: relative;
    display: block;
    width: 100%;
    max-width: 100%;
    overflow: visible;
    height: auto;
    max-height: none;
    line-height: 0;
  }
  [data-tc-type="image-banner"] > img {
    width: 100%;
    height: auto !important;
    max-height: none !important;
    object-fit: contain;
    display: block;
    max-width: 100%;
    position: relative;
    z-index: ${Z_IMAGE};
  }

  [data-tc-type="image-banner"] > *:not(img) {
    position: relative;
    z-index: 10;
  }

  img,
  [data-tc-type="image"] {
    position: relative;
    z-index: ${Z_IMAGE};
  }

  [data-tc-absolute="1"],
  [data-tc-type="hotspot"] {
    position: absolute;
    z-index: ${Z_OVERLAY};
  }
  [data-tc-type="hotspot"] {
    position: absolute;
    z-index: ${Z_HOTSPOT};
    pointer-events: auto;
    cursor: grab;
    box-sizing: border-box;
    line-height: normal;
  }
  [data-tc-type="hotspot"]:active {
    cursor: grabbing;
  }
  /* Cover-full: fill the image banner at any screen size (not a frozen 375px box). */
  [data-tc-type="hotspot"][data-tc-cover-full="1"] {
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: auto !important;
    height: auto !important;
    min-height: 0;
  }

  /* Buttons on images keep content size — never stretch (exclude hotspots) */
  button[data-tc-absolute="1"],
  a[data-tc-type="button"][data-tc-absolute="1"],
  [data-tc-absolute="1"].flow-btn,
  button.flow-btn[data-tc-absolute="1"],
  .flow-btn[data-tc-absolute="1"] {
    width: auto !important;
    max-width: calc(100% - 16px) !important;
    min-width: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
`

/** Preview / export CSS — force absolute so live page matches canvas. */
export const OVERLAY_STACKING_CSS = `
  [data-tc-type="image-banner"] {
    position: relative !important;
    display: block;
    width: 100%;
    max-width: 100%;
    overflow: visible !important;
    height: auto !important;
    line-height: 0;
  }
  [data-tc-type="image-banner"] > img {
    width: 100%;
    height: auto !important;
    max-height: none !important;
    object-fit: contain;
    display: block;
    max-width: 100%;
    position: relative !important;
    z-index: ${Z_IMAGE} !important;
  }

  [data-tc-type="image-banner"] > *:not(img) {
    position: relative !important;
    z-index: 10 !important;
  }

  img,
  [data-tc-type="image"] {
    position: relative;
    z-index: ${Z_IMAGE};
  }

  [data-tc-absolute="1"],
  [data-tc-type="hotspot"] {
    position: absolute !important;
    z-index: ${Z_OVERLAY} !important;
  }
  [data-tc-type="hotspot"] {
    position: absolute !important;
    display: block !important;
    z-index: ${Z_HOTSPOT} !important;
    pointer-events: auto !important;
    cursor: pointer !important;
    text-decoration: none !important;
  }
  [data-tc-type="hotspot"][data-tc-cover-full="1"] {
    top: 0 !important;
    left: 0 !important;
    right: 0 !important;
    bottom: 0 !important;
    width: auto !important;
    height: auto !important;
  }

  button[data-tc-absolute="1"],
  a[data-tc-type="button"][data-tc-absolute="1"],
  [data-tc-absolute="1"].flow-btn,
  button.flow-btn[data-tc-absolute="1"],
  .flow-btn[data-tc-absolute="1"] {
    width: auto !important;
    max-width: calc(100% - 16px) !important;
    min-width: 0 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
  }
`
