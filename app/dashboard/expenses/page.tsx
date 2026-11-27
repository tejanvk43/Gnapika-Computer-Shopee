// app/dashboard/expenses/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import DailyExpensesDashboard from '@/components/expenses/DailyExpensesDashboard'

export default async function ExpensesPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  // Restriction requested by User: Owner only
  if (!context.isOwner) {
    redirect('/dashboard')
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <DailyExpensesDashboard />
    </div>
  )
}
