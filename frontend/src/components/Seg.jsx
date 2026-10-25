// Segmented control with a sliding thumb. Works as a radiogroup or a tablist.
export default function Seg({ items, options, value, onChange, role = 'radiogroup', label }) {
  const rawList = items || options || []
  const normalizedItems = rawList.map((item) => {
    if (Array.isArray(item)) {
      return { id: item[0], label: item[1] }
    }
    if (typeof item === 'object' && item !== null) {
      return { id: item.id ?? item.value, label: item.label ?? item.title ?? item.name ?? String(item.id) }
    }
    return { id: String(item), label: String(item) }
  })

  if (normalizedItems.length === 0) return null

  const idx = Math.max(0, normalizedItems.findIndex((x) => x.id === value))
  const itemRole = role === 'tablist' ? 'tab' : 'radio'
  const key = role === 'tablist' ? 'aria-selected' : 'aria-checked'

  const onKey = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const d = e.key === 'ArrowRight' ? 1 : -1
    const n = (idx + d + normalizedItems.length) % normalizedItems.length
    onChange(normalizedItems[n].id)
    e.currentTarget.parentElement.querySelectorAll('button')[n]?.focus()
  }

  return (
    <div className="seg" role={role} aria-label={label} style={{ '--n': normalizedItems.length, '--i': idx }}>
      <span className="seg-thumb" aria-hidden="true" />
      {normalizedItems.map((it) => (
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
