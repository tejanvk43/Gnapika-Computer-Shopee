// app/dashboard/settings/page.tsx
import { getCurrentUserContext } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseService } from '@/lib/supabase'

export default async function SettingsPage() {
  const context = await getCurrentUserContext()
  if (!context) redirect('/auth/login')

  // Check if user is Owner/Admin
  const { data: membership } = await supabaseService
    .from('organization_memberships')
    .select('role')
    .eq('user_profile_id', context.user.id)
    .eq('organization_id', context.organization_id)
    .single()

  const isAdmin = membership && ['Owner', 'Admin'].includes(membership.role)

  // Get branches
  const { data: branches } = await supabaseService
    .from('branches')
    .select('*')
    .eq('organization_id', context.organization_id)

  // Get users
  const { data: users } = await supabaseService
    .from('user_profiles')
    .select(`
      *,
      organization_memberships ( role ),
      branch_memberships ( branch_id, role, branches ( name ) )
    `)
    .eq('organization_id', context.organization_id)

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {!isAdmin && (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-6">
          You have view-only access to settings. Contact your administrator for changes.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organization Info */}
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Organization</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-muted-foreground">Name</label>
              <input type="text" className="mt-1 w-full rounded-md border px-3 py-2" disabled />
            </div>
            <div>
              <label className="block text-sm text-muted-foreground">GSTIN</label>
              <input type="text" className="mt-1 w-full rounded-md border px-3 py-2" />
            </div>
            {isAdmin && (
              <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">Save Organization</button>
            )}
          </div>
        </div>

        {/* Branches */}
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Branches</h2>
          <div className="space-y-4">
            {branches?.map((branch: any) => (
              <div key={branch.id} className="border p-4 rounded">
                <div className="flex justify-between">
                  <div>
                    <p className="font-medium">{branch.name}</p>
                    <p className="text-sm text-muted-foreground">{branch.address}</p>
                  </div>
                  {isAdmin && (
                    <button className="text-primary hover:underline">Edit</button>
                  )}
                </div>
              </div>
            ))}
            {isAdmin && (
              <button className="w-full py-2 border-2 border-dashed rounded hover:bg-accent">+ Add Branch</button>
            )}
          </div>
        </div>

        {/* Users */}
        <div className="lg:col-span-2 bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Users & Permissions</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Org Role</th>
                  <th className="text-left p-4">Branch Access</th>
                  <th className="text-left p-4">Branch Role</th>
                </tr>
              </thead>
              <tbody>
                {users?.map((user: any) => (
                  <tr key={user.id} className="border-b">
                    <td className="p-4">{user.full_name}</td>
                    <td className="p-4">{user.email}</td>
                    <td className="p-4">{user.organization_memberships?.[0]?.role || 'None'}</td>
                    <td className="p-4">
                      {user.branch_memberships?.map((bm: any) => bm.branches?.name).join(', ') || 'None'}
                    </td>
                    <td className="p-4">
                      {user.branch_memberships?.map((bm: any) => bm.role).join(', ') || 'None'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* GST/Tax Settings */}
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">GST Configuration</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Default GST Rates</label>
              <p className="text-sm text-muted-foreground">Configure CGST, SGST, IGST rates per HSN code</p>
            </div>
            {isAdmin && (
              <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">Manage Tax Rates</button>
            )}
          </div>
        </div>

        {/* Invoice Settings */}
        <div className="bg-card p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Invoice Settings</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Invoice Prefix</label>
              <input type="text" value="INV-" className="mt-1 w-full rounded-md border px-3 py-2" disabled />
            </div>
            <div>
              <label className="block text-sm font-medium">Terms & Conditions</label>
              <textarea className="mt-1 w-full rounded-md border px-3 py-2" rows={4} />
            </div>
            {isAdmin && (
              <button className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90">Save Settings</button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}