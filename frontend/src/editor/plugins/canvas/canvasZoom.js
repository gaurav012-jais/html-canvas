export function setCanvasZoom(editor, zoom) {
  editor.Canvas?.setZoom(zoom)
}

export function getCanvasZoom(editor) {
  return editor.Canvas?.getZoom() ?? 100
}
