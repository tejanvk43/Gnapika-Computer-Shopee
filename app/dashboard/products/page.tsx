// app/dashboard/products/page.tsx
import { supabaseService } from '@/lib/supabase'
import { redirect } from 'next/navigation'
import { getCurrentUserContext } from '@/lib/auth'
import Link from 'next/link'
import { Package, Plus } from 'lucide-react'
import { ProductCatalogTable, ProductCatalogItem } from '@/components/products/ProductCatalogTable'

async function getProductsData() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  const { data: products, error } = await supabaseService
    .from('products')
    .select(`
      id,
      name,
      sku,
      description,
      created_at,
      product_categories ( name ),
      product_barcodes ( barcode_value, barcode_type ),
      branch_products ( current_stock, branch_id )
    `)
    .eq('organization_id', context.organization_id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error fetching products:", error)
    return { products: [] }
  }

  return { products: (products || []) as unknown as ProductCatalogItem[] }
}

export default async function ProductsPage() {
  const { products } = await getProductsData()

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
            <Package className="w-4 h-4" />
            <span>Product Catalog</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Products & Barcodes
          </h1>
          <p className="text-sm text-slate-500">
            View products, add stock in real-time, print labels, and download SVG barcodes.
          </p>
        </div>

        <Link
          href="/dashboard/products/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Product & Barcode</span>
        </Link>
      </div>

      {/* Interactive Products Table with Live Restock & Barcode Download/Print */}
      <ProductCatalogTable initialProducts={products} />
    </div>
  )
}