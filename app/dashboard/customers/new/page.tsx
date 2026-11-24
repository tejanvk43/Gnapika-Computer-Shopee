// app/dashboard/customers/new/page.tsx
import { CustomerForm } from '@/components/customers/CustomerForm'
import { redirect } from 'next/navigation'
import { getCurrentUserContext } from '@/lib/auth'

export default async function NewCustomerPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create New Customer</h1>
        <a href="/dashboard/customers" className="text-primary hover:underline">
          &larr; Back to List
        </a>
      </div>
      <div className="bg-card p-6 rounded-lg shadow max-w-2xl">
        <CustomerForm />
      </div>
    </div>
  )
}
