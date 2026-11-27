// app/api/expenses/[id]/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import { deleteExpense } from '@/lib/expenses'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
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

    let id = ''
    if (params) {
      const resolved = await Promise.resolve(params)
      id = resolved?.id || ''
    }

    if (!id && request.url) {
      const url = new URL(request.url)
      const segments = url.pathname.split('/').filter(Boolean)
      const last = segments[segments.length - 1]
      if (last && last !== 'expenses') {
        id = last
      }
    }

    if (!id) {
      return NextResponse.json({ error: 'Expense ID is required.' }, { status: 400 })
    }

    await deleteExpense(id, context.organization_id)

    return NextResponse.json({ success: true, message: 'Expense deleted successfully.' })
  } catch (error: any) {
    console.error('Error in DELETE expense:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
