// app/dashboard/inventory/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'
import { BranchFilter } from '@/components/inventory/BranchFilter'
import { Warehouse, Plus, ArrowUpDown, AlertTriangle, CheckCircle, Package } from 'lucide-react'
import Link from 'next/link'

async function getInventoryData() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  // Get branches for this organization
  const { data: branches } = await supabaseService
    .from('branches')
    .select('id, name')
    .eq('organization_id', context.organization_id)

  // Get inventory with product details using joined branches
  const { data: inventory, error } = await supabaseService
    .from('branch_products')
    .select(`
      id,
      current_stock,
      products ( id, name, sku, product_categories ( name ) ),
      branches!inner ( id, name, organization_id )
    `)
    .eq('branches.organization_id', context.organization_id)
    .order('current_stock', { ascending: true })

  if (error) {
    console.warn("Notice: branch_products query:", error.message)
    // Fallback: If no branch products yet, return products from organization
    const { data: orgProducts } = await supabaseService
      .from('products')
      .select('id, name, sku, product_categories ( name )')
      .eq('organization_id', context.organization_id)

    return { 
      inventory: (orgProducts || []).map((p: any) => ({
        id: p.id,
        current_stock: 0,
        products: p,
        branches: { name: 'Main Store' }
      })), 
      branches: branches || [] 
    }
  }

  return { inventory: inventory || [], branches: branches || [] }
}

export default async function InventoryPage() {
  const { inventory, branches } = await getInventoryData()

  const totalItems = inventory.length
  const lowStockCount = inventory.filter((i: any) => parseFloat(i.current_stock) > 0 && parseFloat(i.current_stock) <= 10).length
  const outOfStockCount = inventory.filter((i: any) => parseFloat(i.current_stock) <= 0).length

  return (
    <div className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <Warehouse className="w-4 h-4" />
            <span>Warehouse & Stock</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">
            Inventory Management
          </h1>
          <p className="text-sm text-slate-500">
            Monitor real-time branch stock levels, manage low-inventory alerts, and track accessories.
          </p>
        </div>

        <Link
          href="/dashboard/purchases"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Purchase Bill</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-slate-500 uppercase">Tracked SKUs</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{totalItems}</div>
        </div>
        <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Low Stock (&le; 10 units)</span>
          </div>
          <div className="text-2xl font-bold text-amber-900 dark:text-amber-300 mt-1">{lowStockCount}</div>
        </div>
        <div className="p-4 bg-rose-50/60 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl shadow-xs">
          <div className="text-xs font-semibold text-rose-700 dark:text-rose-400 uppercase">Out of Stock</div>
          <div className="text-2xl font-bold text-rose-900 dark:text-rose-300 mt-1">{outOfStockCount}</div>
        </div>
      </div>

      {/* Branch Filter */}
      {branches && branches.length > 1 && (
        <BranchFilter branches={branches} />
      )}

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Product & Model</th>
                <th className="p-4">SKU</th>
                <th className="p-4">Category</th>
                <th className="p-4">Branch</th>
                <th className="p-4 text-right">Current Stock</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {inventory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No inventory records found. Add your first product to begin tracking stock.
                  </td>
                </tr>
              ) : (
                inventory.map((item: any) => {
                  const stock = parseFloat(item.current_stock || '0')
                  const isLow = stock > 0 && stock <= 10
                  const isOut = stock <= 0

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                      <td className="p-4 pl-6 font-semibold text-slate-900 dark:text-white">
                        {item.products?.name || 'Unnamed Product'}
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                        {item.products?.sku || 'N/A'}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {item.products?.product_categories?.name || 'General'}
                      </td>
                      <td className="p-4 text-slate-600 dark:text-slate-400">
                        {item.branches?.name || 'Main Store'}
                      </td>
                      <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                        {stock.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                            Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                            <CheckCircle className="w-3 h-3" />
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <Link
                          href="/dashboard/billing/new"
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                        >
                          Bill Item &rarr;
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}