/**
 * Overlay stacking: buttons/hotspots on images must paint ABOVE the image,
 * and canvas/preview must share the same rules (WYSIWYG).
 *
 * Facade module re-exporting from focused stacking submodules.
 */

export {
  Z_IMAGE,
  Z_OVERLAY,
  Z_HOTSPOT,
  IMAGE_BANNER_STYLE,
  HOTSPOT_RESIZABLE,
  clampPct,
  fitBoxPct,
  pct,
  defaultHotspotBox,
  hotspotChrome,
  styleToPct,
  hrefIsNavigationTarget,
  applyBannerHostStyle,
  ensureImageLayout,
  coverFullBox,
  applyCoverFullToEl,
  OVERLAY_STACKING_CANVAS_CSS,
  OVERLAY_STACKING_CSS,
} from './stacking/stackingConstants'

export {
  directChildImageEl,
  imageBoxReady,
  remapHotspotToAnchor,
  findHotspotImageEl,
  pinLiveHotspotToImage,
  fitCreativeToViewport,
  wrapImageAsBanner,
  isImgLikeComponent,
  findImageSiblingComponent,
  findImageComponentDeep,
  syncHotspotElToModel,
  pinEditorHotspotToImage,
  persistEditorHotspotBox,
  freezeHotspotToPixels,
  coverHotspotFullImage,
  normalizeHotspotBox,
} from './stacking/hotspotGeometry'

export {
  isImageComponent,
  isHotspotComponent,
  isImageBannerHost,
  dropPointHitsImage,
  parentHasImageSibling,
  isOverImageContext,
  ensureParentRelative,
  markAsAbsoluteOverlay,
  promoteOverlayIfNeeded,
} from './stacking/overlayDetection'

export {
  clearHotspotGeometryRules,
  hasPercentGeometry,
  applyHotspotChrome,
  healEditorHotspot,
  healLiveHotspots,
} from './stacking/hotspotHealing'
