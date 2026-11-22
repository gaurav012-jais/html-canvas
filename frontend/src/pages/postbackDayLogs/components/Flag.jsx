import { memo } from 'react'
import { ynClass } from '../dayLogConstants'

function Flag({ label, yes, fail, extra }) {
  const text = fail ? 'FAIL' : yes ? 'YES' : 'NO'
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${ynClass(yes, fail)}`}
      title={extra || label}
    >
      <span className="uppercase tracking-wide text-[10px] opacity-70">{label}</span>
      {text}
    </span>
  )
}

export default memo(Flag)
