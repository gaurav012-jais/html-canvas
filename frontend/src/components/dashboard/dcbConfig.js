/**
 * DCB Configuration helpers and generators facade.
 * Re-exports defaults, payloads, and guides from focused submodules.
 */

export {
  CLASSIC_PACK_OPTIONS,
  DEFAULT_DCB_CONFIG,
  DEFAULT_DCB_ENDPOINTS,
  DEFAULT_DCB_REQUEST_FIELDS,
  cloneDefaults,
  endpointPath,
  normalizeNamed,
  normalizeEndpoints,
  normalizeMappings,
} from './dcb/dcbDefaults'

export {
  parseDcbConfig,
  serializeDcbConfig,
  previewPincodePayload,
  previewConfirmPayload,
  joinUrl,
  editorPackOptions,
} from './dcb/dcbPayloads'

export {
  previewPublicConfigResponse,
  previewSubEntitledResponse,
  previewPinSuccessResponse,
  previewConfirmSuccessResponse,
  buildDcbApiGuide,
} from './dcb/dcbApiGuide'
