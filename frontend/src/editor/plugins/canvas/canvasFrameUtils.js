export function getCanvasFrameEl(editor) {
  if (!editor?.Canvas?.getFrameEl) return null
  return editor.Canvas.getFrameEl()
}
