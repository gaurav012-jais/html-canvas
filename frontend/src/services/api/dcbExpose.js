/**
 * Backwards compatibility shim.
 * All DCB expose functions have been merged into ./dcb.js
 */
export {
  buildDcbExposeUrls,
  buildDcbExposeApiPayload,
  buildDcbExposeMarkdownGuide,
  buildDcbExposeApiGuide,
} from './dcb'
