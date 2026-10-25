// Segmented control with a sliding thumb. Works as a radiogroup or a tablist.
export default function Seg({ items, options, value, onChange, role = 'radiogroup', label }) {
  const raw = items || options || []
  const list = raw.map((it) => {
    if (Array.isArray(it)) {
      return { id: it[0], label: it[1] }
    }
    return it
  })

  const idx = Math.max(0, list.findIndex((x) => x?.id === value))
  const itemRole = role === 'tablist' ? 'tab' : 'radio'
  const key = role === 'tablist' ? 'aria-selected' : 'aria-checked'

  const onKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    if (list.length === 0) return
    const d = e.key === 'ArrowRight' ? 1 : -1
    const n = (idx + d + list.length) % list.length
    onChange(list[n].id)
    e.currentTarget.parentElement.querySelectorAll('button')[n]?.focus()
  }

  return (
    <div className="seg" role={role} aria-label={label} style={{ '--n': list.length, '--i': idx }}>
      <span className="seg-thumb" aria-hidden="true" />
      {list.map((it) => (
        <button
          key={it.id}
          type="button"
          role={itemRole}
          {...{ [key]: it.id === value }}
          tabIndex={it.id === value ? 0 : -1}
          onClick={() => onChange(it.id)}
          onKeyDown={onKey}
        >
          {it.label}
        </button>
      ))}
    </div>
  )
}
