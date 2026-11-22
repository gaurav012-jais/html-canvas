/**
 * Typography, text size alignment, and flow button geometry facade.
 * Re-exports from focused textAlignment submodules.
 */

export {
  MIN_BTN_HEIGHT,
  MIN_BTN_WIDTH,
  TEXT_TAGS,
  FLOW_ACTIONS,
  FLOW_OTP,
  parsePx,
  isButtonLikeComponent,
  isTextSizedComponent,
  isFlowLayoutButton,
  wasIntentionallyAbsolute,
  BLOCK_CONTAINER_TAGS,
  isResizableBlockContainer,
} from './textAlignment/buttonDetection'

export {
  stripAbsoluteFromEl,
  stripAbsoluteStyleAttribute,
  resolveFlowButtonWidth,
  syncFlowButtonDom,
  keepFlowButtonInFlow,
  enforceFlowButtonSize,
  FLOW_BUTTON_RESIZABLE,
  OVERLAY_BUTTON_RESIZABLE,
  configureFlowButtonResizable,
  FLOW_BLOCK_RESIZABLE,
  ABSOLUTE_BLOCK_RESIZABLE,
  configureBlockResizable,
  applyTextSizeAlignment,
} from './textAlignment/buttonLayout'

export {
  healFlowButtonsInEditor,
  healLiveFlowButtons,
  TEXT_SIZE_ALIGN_CANVAS_CSS,
} from './textAlignment/buttonHealing'
