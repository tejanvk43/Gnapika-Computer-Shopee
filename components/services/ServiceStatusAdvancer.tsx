'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

export function ServiceStatusAdvancer({
  serviceId,
  currentStatus,
  nextStatus,
}: {
  serviceId: string
  currentStatus: string
  nextStatus?: string
}) {
  const router = useRouter()
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  if (!nextStatus) {
    return (
      <div className="pt-4 border-t text-center text-xs text-slate-500 flex items-center justify-center gap-1.5 font-semibold text-emerald-600">
        <CheckCircle2 className="w-4 h-4" />
        <span>Service Job Completed &amp; Delivered</span>
      </div>
    )
  }

  const handleAdvance = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/services/${serviceId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          next_status: nextStatus,
          notes: notes.trim(),
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to advance status')
      }

      toast.success(`Job advanced to "${nextStatus}"`)
      setNotes('')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error updating status')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleAdvance} className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Workflow notes (optional)"
        className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 text-slate-900 dark:text-white"
        rows={2}
      />
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white transition shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
      >
        {loading ? (
          <span>Updating Status...</span>
        ) : (
          <>
            <span>Advance to &quot;{nextStatus}&quot;</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </form>
  )
}
