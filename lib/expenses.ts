// lib/expenses.ts
import { supabaseService } from './supabase'

export interface DailyExpense {
  id: string
  organization_id: string
  branch_id?: string
  expense_date: string // YYYY-MM-DD
  reason: string
  cost: number
  payment_method: string
  category: string
  notes?: string
  created_by_user_id?: string
  created_at?: string
  updated_at?: string
}

export interface DateClusteredExpenses {
  date: string
  formattedDate: string
  relativeLabel?: string
  totalCost: number
  items: DailyExpense[]
}

/**
 * Fetch all expenses for an organization
 */
export async function getExpenses(
  organizationId: string,
  options?: {
    startDate?: string
    endDate?: string
    category?: string
  }
): Promise<DailyExpense[]> {
  try {
    // 1. Try querying daily_expenses table
    let query = supabaseService
      .from('daily_expenses')
      .select('*')
      .eq('organization_id', organizationId)
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (options?.startDate) {
      query = query.gte('expense_date', options.startDate)
    }
    if (options?.endDate) {
      query = query.lte('expense_date', options.endDate)
    }
    if (options?.category && options.category !== 'All') {
      query = query.eq('category', options.category)
    }

    const { data, error } = await query

    // Check for any tombstones in audit_logs
    const deletedIds = new Set<string>()
    try {
      const { data: tombstones } = await supabaseService
        .from('audit_logs')
        .select('details')
        .eq('organization_id', organizationId)
        .eq('action', 'EXPENSE_DELETED')

      if (tombstones && Array.isArray(tombstones)) {
        for (const t of tombstones) {
          let det = t.details
          if (typeof det === 'string') {
            try { det = JSON.parse(det) } catch {}
          }
          if (det?.id) deletedIds.add(det.id)
        }
      }
    } catch {}

    if (!error && data) {
      return data
        .filter((d: any) => !deletedIds.has(d.id))
        .map((d: any) => ({
          id: d.id,
          organization_id: d.organization_id,
          branch_id: d.branch_id,
          expense_date: d.expense_date,
          reason: d.reason,
          cost: parseFloat(d.cost || 0),
          payment_method: d.payment_method || 'Cash',
          category: d.category || 'General',
          notes: d.notes || '',
          created_by_user_id: d.created_by_user_id,
          created_at: d.created_at,
          updated_at: d.updated_at,
        }))
    }
  } catch (err) {
    console.warn('daily_expenses table query notice:', err)
  }

  // 2. Fallback to audit_logs
  try {
    const { data: auditRows, error: auditError } = await supabaseService
      .from('audit_logs')
      .select('id, details, timestamp, action')
      .eq('organization_id', organizationId)
      .in('action', ['EXPENSE_RECORD', 'EXPENSE_DELETED'])
      .order('timestamp', { ascending: false })

    if (auditError || !auditRows) return []

    const deletedIds = new Set<string>()
    for (const r of auditRows) {
      if (r.action === 'EXPENSE_DELETED') {
        let det = r.details
        if (typeof det === 'string') {
          try { det = JSON.parse(det) } catch {}
        }
        if (det?.id) deletedIds.add(det.id)
      }
    }

    const map = new Map<string, DailyExpense>()
    for (const r of auditRows) {
      if (r.action !== 'EXPENSE_RECORD') continue

      let exp = r.details as any
      if (typeof exp === 'string') {
        try { exp = JSON.parse(exp) } catch {}
      }

      if (exp && exp.id && !deletedIds.has(exp.id) && !map.has(exp.id)) {
        if (options?.startDate && exp.expense_date < options.startDate) continue
        if (options?.endDate && exp.expense_date > options.endDate) continue
        if (options?.category && options.category !== 'All' && exp.category !== options.category) continue

        map.set(exp.id, {
          ...exp,
          cost: parseFloat(exp.cost as any) || 0,
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (b.expense_date !== a.expense_date) {
        return b.expense_date.localeCompare(a.expense_date)
      }
      return (b.created_at || '').localeCompare(a.created_at || '')
    })
  } catch (err) {
    console.error('Audit log expense fallback error:', err)
    return []
  }
}

/**
 * Save (create or update) a daily expense
 */
export async function saveExpense(
  data: Partial<DailyExpense>,
  organizationId: string,
  userId: string
): Promise<DailyExpense> {
  const expenseId = data.id || crypto.randomUUID()
  const todayStr = new Date().toISOString().slice(0, 10)

  const record: DailyExpense = {
    id: expenseId,
    organization_id: organizationId,
    branch_id: data.branch_id,
    expense_date: data.expense_date || todayStr,
    reason: (data.reason || '').trim(),
    cost: parseFloat(data.cost as any) || 0,
    payment_method: data.payment_method || 'Cash',
    category: data.category || 'General',
    notes: data.notes || '',
    created_by_user_id: userId,
    created_at: data.created_at || new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // 1. Try upserting into daily_expenses table
  try {
    const { error } = await supabaseService.from('daily_expenses').upsert(record, { onConflict: 'id' })
    if (!error) {
      console.log('Saved expense to daily_expenses table')
    }
  } catch (err) {
    console.warn('daily_expenses table upsert notice:', err)
  }

  // 2. Always write to audit_logs backup for zero-downtime persistence
  try {
    await supabaseService.from('audit_logs').insert([
      {
        organization_id: organizationId,
        user_id: userId,
        action: 'EXPENSE_RECORD',
        entity_type: 'EXPENSE',
        details: record,
      },
    ])
  } catch (err) {
    console.error('Audit log expense backup write error:', err)
  }

  return record
}

/**
 * Delete an expense
 */
export async function deleteExpense(id: string, organizationId: string): Promise<boolean> {
  // 1. Try to delete from daily_expenses table if table exists
  try {
    const { error } = await supabaseService
      .from('daily_expenses')
      .delete()
      .eq('id', id)
      .eq('organization_id', organizationId)
    if (error) {
      console.warn('daily_expenses delete notice:', error.message)
    }
  } catch (err) {
    console.warn('daily_expenses delete exception caught:', err)
  }

  // 2. Insert tombstone into audit_logs so it works even if audit_logs is append-only
  try {
    await supabaseService.from('audit_logs').insert([
      {
        organization_id: organizationId,
        action: 'EXPENSE_DELETED',
        entity_type: 'EXPENSE',
        details: { id },
      },
    ])
  } catch (err) {
    console.warn('Audit log tombstone write notice:', err)
  }

  // 3. Also try deleting matching records from audit_logs (best effort)
  try {
    const { data: records } = await supabaseService
      .from('audit_logs')
      .select('id, details')
      .eq('organization_id', organizationId)
      .eq('action', 'EXPENSE_RECORD')

    if (records && Array.isArray(records)) {
      const toDelete: string[] = []
      for (const r of records) {
        let det = r.details
        if (typeof det === 'string') {
          try { det = JSON.parse(det) } catch {}
        }
        if (det?.id === id) {
          toDelete.push(r.id)
        }
      }
      if (toDelete.length > 0) {
        await supabaseService.from('audit_logs').delete().in('id', toDelete)
      }
    }
  } catch (err) {
    console.warn('Audit log delete notice:', err)
  }

  return true
}

/**
 * Groups / clusters expenses date-wise for clear reference
 */
export function clusterExpensesDatewise(expenses: DailyExpense[]): DateClusteredExpenses[] {
  const map = new Map<string, DailyExpense[]>()

  for (const exp of expenses) {
    const dateKey = exp.expense_date || 'Unknown'
    if (!map.has(dateKey)) {
      map.set(dateKey, [])
    }
    map.get(dateKey)!.push(exp)
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().slice(0, 10)

  const clusters: DateClusteredExpenses[] = []

  const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a))

  for (const d of sortedDates) {
    const items = map.get(d) || []
    const totalCost = Math.round(items.reduce((acc, it) => acc + (it.cost || 0), 0) * 100) / 100

    let relativeLabel: string | undefined = undefined
    if (d === todayStr) {
      relativeLabel = 'Today'
    } else if (d === yesterdayStr) {
      relativeLabel = 'Yesterday'
    }

    const dateObj = new Date(d)
    const formattedDate = !isNaN(dateObj.getTime())
      ? dateObj.toLocaleDateString('en-IN', {
          weekday: 'long',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : d

    clusters.push({
      date: d,
      formattedDate,
      relativeLabel,
      totalCost,
      items,
    })
  }

  return clusters
}

/**
 * Computes high-level expense statistics (Today, This Week, This Month, All Time)
 */
export function computeExpenseStats(expenses: DailyExpense[]) {
  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)

  // Start of week (Sunday or Monday)
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  const startOfWeekStr = startOfWeek.toISOString().slice(0, 10)

  // Start of month
  const currentMonthPrefix = todayStr.slice(0, 7) // 'YYYY-MM'

  let todayTotal = 0
  let weekTotal = 0
  let monthTotal = 0
  let overallTotal = 0

  for (const e of expenses) {
    const c = e.cost || 0
    overallTotal += c

    if (e.expense_date === todayStr) {
      todayTotal += c
    }
    if (e.expense_date >= startOfWeekStr) {
      weekTotal += c
    }
    if (e.expense_date.startsWith(currentMonthPrefix)) {
      monthTotal += c
    }
  }

  return {
    todayTotal: Math.round(todayTotal * 100) / 100,
    weekTotal: Math.round(weekTotal * 100) / 100,
    monthTotal: Math.round(monthTotal * 100) / 100,
    overallTotal: Math.round(overallTotal * 100) / 100,
    count: expenses.length,
  }
}
