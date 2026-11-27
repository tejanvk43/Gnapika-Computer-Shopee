// app/api/expenses/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import {
  getExpenses,
  saveExpense,
  deleteExpense,
  clusterExpensesDatewise,
  computeExpenseStats,
} from '@/lib/expenses'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Owner only restriction
    if (!context.isOwner) {
      return NextResponse.json(
        { error: 'Access Denied: Daily expenses tracker is reserved for the shop owner.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined
    const category = searchParams.get('category') || undefined

    const expenses = await getExpenses(context.organization_id, {
      startDate,
      endDate,
      category,
    })

    const clusters = clusterExpensesDatewise(expenses)
    const stats = computeExpenseStats(expenses)

    return NextResponse.json({
      expenses,
      clusters,
      stats,
    })
  } catch (error: any) {
    console.error('Error in expenses GET:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!context.isOwner) {
      return NextResponse.json(
        { error: 'Access Denied: Only the shop owner can record or modify expenses.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { reason, cost, expense_date, payment_method, category, notes, id } = body

    if (!reason || !reason.trim()) {
      return NextResponse.json({ error: 'Expense reason is required.' }, { status: 400 })
    }

    const numericCost = parseFloat(cost)
    if (isNaN(numericCost) || numericCost <= 0) {
      return NextResponse.json({ error: 'Please enter a valid cost greater than 0.' }, { status: 400 })
    }

    const saved = await saveExpense(
      {
        id,
        reason: reason.trim(),
        cost: numericCost,
        expense_date: expense_date || new Date().toISOString().slice(0, 10),
        payment_method: payment_method || 'Cash',
        category: category || 'General',
        notes: notes || '',
        branch_id: context.branch_id,
      },
      context.organization_id,
      context.user.id
    )

    return NextResponse.json({
      success: true,
      expense: saved,
      message: 'Expense recorded successfully.',
    })
  } catch (error: any) {
    console.error('Error in expenses POST:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!context.isOwner) {
      return NextResponse.json(
        { error: 'Access Denied: Only the shop owner can delete expenses.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    let id = searchParams.get('id')
    if (!id) {
      try {
        const body = await request.json()
        id = body?.id
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required.' }, { status: 400 })
    }

    await deleteExpense(id, context.organization_id)

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully.',
    })
  } catch (error: any) {
    console.error('Error in expenses route DELETE:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
