'use client'

export function BranchFilter({ branches }: { branches: { id: string; name: string }[] }) {
  return (
    <div className="mb-6 flex gap-4">
      <select
        className="rounded-md border px-3 py-2"
        onChange={(e) => {
          const url = new URL(window.location.href)
          if (e.target.value) {
            url.searchParams.set('branch', e.target.value)
          } else {
            url.searchParams.delete('branch')
          }
          window.location.href = url.toString()
        }}
      >
        <option value="">All Branches</option>
        {branches.map((b: any) => (
          <option key={b.id} value={b.id}>{b.name}</option>
        ))}
      </select>
    </div>
  )
}
