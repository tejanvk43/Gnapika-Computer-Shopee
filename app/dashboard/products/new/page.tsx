// app/dashboard/products/new/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { ProductForm } from '@/components/products/ProductForm'
import Link from 'next/link'
import { ArrowLeft, PackagePlus } from 'lucide-react'

async function getCategories() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const { data } = await supabaseService
    .from('product_categories')
    .select('id, name')
    .eq('organization_id', context.organization_id)

  return (data || []) as { id: string; name: string }[]
}

export default async function NewProductPage() {
  const categories = await getCategories()

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <PackagePlus className="w-4 h-4" />
            <span>Inventory & Catalog</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Add New Product & Generate Barcode
          </h1>
          <p className="text-sm text-slate-500">
            Register accessory or product details, set inventory, and generate printable barcode labels.
          </p>
        </div>
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Products</span>
        </Link>
      </div>

      <ProductForm categories={categories} />
    </div>
  )
}