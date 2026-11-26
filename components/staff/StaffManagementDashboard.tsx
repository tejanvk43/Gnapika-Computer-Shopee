'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Users,
  UserPlus,
  ShieldCheck,
  Receipt,
  Wrench,
  KeyRound,
  Trash2,
  Edit2,
  Eye,
  Check,
  X,
  Lock,
  Mail,
  User,
  ShoppingBag,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Shield,
  Layers,
} from 'lucide-react'
import { formatCurrency } from '@/lib/formatters'

interface StaffMember {
  id: string
  email: string
  full_name: string
  role: string
  is_owner: boolean
  permissions: string[]
  created_at: string
  is_current_user: boolean
  stats: {
    invoices_count: number
    total_sales: number
    services_count: number
    services_completed: number
  }
}

interface StaffManagementDashboardProps {
  initialStaff: StaffMember[]
  currentUserEmail?: string
}

const AVAILABLE_PERMISSIONS = [
  { id: 'billing', label: 'Billing / POS', desc: 'Create and view product invoices', icon: Receipt, color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 border-blue-200' },
  { id: 'services', label: 'Service & Repairs', desc: 'Register devices, update status, generate service bills', icon: Wrench, color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/40 border-orange-200' },
  { id: 'inventory', label: 'Inventory & Stock', desc: 'View and adjust product stocks', icon: ShoppingBag, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200' },
  { id: 'purchases', label: 'Purchases & Suppliers', desc: 'Inward purchase receipts and supplier stock', icon: Layers, color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/40 border-purple-200' },
  { id: 'reports', label: 'Reports & Analytics', desc: 'View daily revenue and sales reports', icon: TrendingUp, color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200' },
]

export function StaffManagementDashboard({
  initialStaff,
  currentUserEmail,
}: StaffManagementDashboardProps) {
  const router = useRouter()
  const [staffList, setStaffList] = useState<StaffMember[]>(initialStaff)

  // Modals state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null)

  // Add Form state
  const [addName, setAddName] = useState('')
  const [addEmail, setAddEmail] = useState('')
  const [addPassword, setAddPassword] = useState('')
  const [addPreset, setAddPreset] = useState<'billing' | 'services' | 'both' | 'custom'>('both')
  const [addPermissions, setAddPermissions] = useState<string[]>(['billing', 'services'])
  const [submittingAdd, setSubmittingAdd] = useState(false)

  // Edit Form state
  const [editPermissions, setEditPermissions] = useState<string[]>([])
  const [submittingEdit, setSubmittingEdit] = useState(false)

  // Password reset state
  const [newPassword, setNewPassword] = useState('')
  const [submittingPassword, setSubmittingPassword] = useState(false)

  // Activity state
  const [activityLoading, setActivityLoading] = useState(false)
  const [activityData, setActivityData] = useState<{
    invoices: any[]
    services: any[]
    summary: { total_invoices: number; total_sales: number; total_services: number; completed_services: number }
  } | null>(null)
  const [activityTab, setActivityTab] = useState<'billing' | 'services'>('billing')

  // Handle Preset Selection for Add Modal
  const handlePresetChange = (preset: 'billing' | 'services' | 'both' | 'custom') => {
    setAddPreset(preset)
    if (preset === 'billing') {
      setAddPermissions(['billing'])
    } else if (preset === 'services') {
      setAddPermissions(['services'])
    } else if (preset === 'both') {
      setAddPermissions(['billing', 'services'])
    }
  }

  const togglePermission = (permId: string, current: string[], setter: (v: string[]) => void) => {
    if (current.includes(permId)) {
      setter(current.filter((p) => p !== permId))
    } else {
      setter([...current, permId])
    }
  }

  // Handle Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!addName.trim() || !addEmail.trim() || !addPassword) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (addPermissions.length === 0) {
      toast.error('Please grant at least one permission (e.g. Billing or Services).')
      return
    }

    setSubmittingAdd(true)
    try {
      const res = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: addName.trim(),
          email: addEmail.trim(),
          password: addPassword,
          permissions: addPermissions,
          role: 'Staff',
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create staff member.')
      }

      toast.success(data.message || 'Staff member added successfully!')
      setShowAddModal(false)
      setAddName('')
      setAddEmail('')
      setAddPassword('')
      setAddPreset('both')
      setAddPermissions(['billing', 'services'])

      // Refresh staff list
      refreshStaffList()
    } catch (err: any) {
      toast.error(err.message || 'Error creating staff member.')
    } finally {
      setSubmittingAdd(false)
    }
  }

  // Handle Edit Permissions
  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff) return

    setSubmittingEdit(true)
    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          permissions: editPermissions,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update permissions.')
      }

      toast.success(`Updated access permissions for ${selectedStaff.full_name}`)
      setShowEditModal(false)
      refreshStaffList()
    } catch (err: any) {
      toast.error(err.message || 'Error updating permissions.')
    } finally {
      setSubmittingEdit(false)
    }
  }

  // Handle Password Reset
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStaff || !newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    setSubmittingPassword(true)
    try {
      const res = await fetch(`/api/staff/${selectedStaff.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to reset password.')

      toast.success(`Password reset successfully for ${selectedStaff.full_name}`)
      setShowPasswordModal(false)
      setNewPassword('')
    } catch (err: any) {
      toast.error(err.message || 'Error resetting password.')
    } finally {
      setSubmittingPassword(false)
    }
  }

  // Handle Delete Staff
  const handleDeleteStaff = async (staff: StaffMember) => {
    if (staff.is_owner || staff.is_current_user) {
      toast.error('You cannot delete an owner account.')
      return
    }

    if (!confirm(`Are you sure you want to remove staff member "${staff.full_name}" (${staff.email})? They will immediately lose access.`)) {
      return
    }

    try {
      const res = await fetch(`/api/staff/${staff.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to delete staff member.')

      toast.success(`Staff member "${staff.full_name}" has been removed.`)
      setStaffList(staffList.filter((s) => s.id !== staff.id))
    } catch (err: any) {
      toast.error(err.message || 'Error removing staff.')
    }
  }

  // Open Activity Modal
  const handleOpenActivity = async (staff: StaffMember) => {
    setSelectedStaff(staff)
    setShowActivityModal(true)
    setActivityLoading(true)
    setActivityData(null)

    try {
      const res = await fetch(`/api/staff/${staff.id}/activity`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load activity.')
      setActivityData(data)
    } catch (err: any) {
      toast.error(err.message || 'Error loading staff activity.')
    } finally {
      setActivityLoading(false)
    }
  }

  const refreshStaffList = async () => {
    try {
      const res = await fetch('/api/staff')
      if (res.ok) {
        const data = await res.json()
        if (data.staff) setStaffList(data.staff)
      }
    } catch {}
    router.refresh()
  }

  // Calculations for stats
  const totalStaffCount = staffList.length
  const billingStaffCount = staffList.filter((s) => s.is_owner || s.permissions.includes('billing') || s.permissions.includes('*')).length
  const serviceStaffCount = staffList.filter((s) => s.is_owner || s.permissions.includes('services') || s.permissions.includes('*')).length

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Access Control &amp; Team Management</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white">
            Staff &amp; Permissions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Create staff accounts, configure exact module permissions (Billing only, Service only, or both), and inspect activity.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md transition cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Staff Member</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Team</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{totalStaffCount}</p>
            <span className="text-[11px] text-slate-500">Authorized Accounts</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-blue-500 uppercase tracking-wide">Billing Operators</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{billingStaffCount}</p>
            <span className="text-[11px] text-slate-500">POS &amp; Invoices Allowed</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-orange-500 uppercase tracking-wide">Service Technicians</span>
            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">{serviceStaffCount}</p>
            <span className="text-[11px] text-slate-500">Device Intake &amp; Bills Allowed</span>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center text-orange-600">
            <Wrench className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <span>Active Team Members ({staffList.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Owner has full control over all modules</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/50 font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 pl-6">Staff Member</th>
                <th className="p-4">Role</th>
                <th className="p-4">Allowed Modules</th>
                <th className="p-4">Billing Activity</th>
                <th className="p-4">Service Activity</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {staffList.map((member) => {
                const isBilling = member.is_owner || member.permissions.includes('billing') || member.permissions.includes('*')
                const isService = member.is_owner || member.permissions.includes('services') || member.permissions.includes('*')

                return (
                  <tr key={member.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition">
                    {/* Name & Email */}
                    <td className="p-4 pl-6">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          member.is_owner ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}>
                          {member.full_name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{member.full_name}</span>
                            {member.is_current_user && (
                              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-bold">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {member.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="p-4">
                      {member.is_owner ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                          <ShieldCheck className="w-3 h-3" />
                          <span>Owner</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <span>Staff</span>
                        </span>
                      )}
                    </td>

                    {/* Allowed Modules */}
                    <td className="p-4">
                      {member.is_owner ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold">
                          All Modules (Full Access)
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {isBilling && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                              <Receipt className="w-3 h-3" />
                              <span>Billing</span>
                            </span>
                          )}
                          {isService && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                              <Wrench className="w-3 h-3" />
                              <span>Services</span>
                            </span>
                          )}
                          {!isBilling && !isService && (
                            <span className="text-[11px] text-slate-400 italic">No modules granted</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Billing Stats */}
                    <td className="p-4 font-mono">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {member.stats.invoices_count}
                        </span>{' '}
                        <span className="text-slate-400 text-[11px]">bills</span>
                      </div>
                      <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                        ₹{member.stats.total_sales.toLocaleString('en-IN')}
                      </div>
                    </td>

                    {/* Service Stats */}
                    <td className="p-4 font-mono">
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {member.stats.services_count}
                        </span>{' '}
                        <span className="text-slate-400 text-[11px]">jobs</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {member.stats.services_completed} completed
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="p-4 pr-6 text-right">
                      <div className="inline-flex items-center gap-1.5 justify-end">
                        {/* View Things Done / Activity */}
                        <button
                          type="button"
                          onClick={() => handleOpenActivity(member)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          title="View Activity & Logs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {!member.is_owner && (
                          <>
                            {/* Edit Permissions */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStaff(member)
                                setEditPermissions([...member.permissions])
                                setShowEditModal(true)
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition"
                              title="Edit Access Permissions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Reset Password */}
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedStaff(member)
                                setNewPassword('')
                                setShowPasswordModal(true)
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition"
                              title="Set New Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete Staff */}
                            <button
                              type="button"
                              onClick={() => handleDeleteStaff(member)}
                              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
                              title="Remove Staff"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ADD STAFF MODAL */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-lg w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Add Staff Member
                  </h3>
                  <p className="text-xs text-slate-400">Create access credentials &amp; assign modules</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={addName}
                    onChange={(e) => setAddName(e.target.value)}
                    placeholder="e.g. Ramesh Kumar"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Login Email *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={addEmail}
                    onChange={(e) => setAddEmail(e.target.value)}
                    placeholder="e.g. ramesh@gnapika.com"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary text-slate-900 dark:text-white font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Initial Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-primary text-slate-900 dark:text-white font-mono"
                    required
                    minLength={6}
                  />
                </div>
                <span className="text-[10px] text-slate-400">Share this password with the staff member to log in.</span>
              </div>

              {/* Module Access Quick Presets */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Module Access Level *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handlePresetChange('billing')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      addPreset === 'billing'
                        ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/60 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/30'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Receipt className="w-4 h-4 text-blue-600 mb-1" />
                    <div className="font-bold text-xs">Billing Only</div>
                    <div className="text-[10px] text-slate-400">POS &amp; Bills</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetChange('services')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      addPreset === 'services'
                        ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/60 text-orange-900 dark:text-orange-200 ring-2 ring-orange-500/30'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <Wrench className="w-4 h-4 text-orange-600 mb-1" />
                    <div className="font-bold text-xs">Service Only</div>
                    <div className="text-[10px] text-slate-400">Repairs &amp; Slips</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePresetChange('both')}
                    className={`p-2.5 rounded-xl border text-left transition ${
                      addPreset === 'both'
                        ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/60 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/30'
                        : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mb-1" />
                    <div className="font-bold text-xs">Both Modules</div>
                    <div className="text-[10px] text-slate-400">Billing + Service</div>
                  </button>
                </div>
              </div>

              {/* Granular Checkboxes */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Permissions Breakdown:
                </span>
                <div className="space-y-1">
                  {AVAILABLE_PERMISSIONS.map((p) => {
                    const isChecked = addPermissions.includes(p.id)
                    const Icon = p.icon
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center justify-between p-2 rounded-xl border text-xs cursor-pointer transition ${
                          isChecked
                            ? 'bg-slate-50 dark:bg-slate-800 border-primary/40'
                            : 'border-slate-100 dark:border-slate-800 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => togglePermission(p.id, addPermissions, setAddPermissions)}
                            className="rounded text-primary focus:ring-primary"
                          />
                          <Icon className="w-3.5 h-3.5" />
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{p.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{p.desc}</span>
                      </label>
                    )
                  })}
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAdd}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {submittingAdd ? 'Creating Staff...' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT PERMISSIONS MODAL */}
      {/* ========================================================================= */}
      {showEditModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-md w-full space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Edit Access: {selectedStaff.full_name}
                </h3>
                <p className="text-xs text-slate-400 font-mono">{selectedStaff.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Select Allowed Modules:
                </label>
                {AVAILABLE_PERMISSIONS.map((p) => {
                  const isChecked = editPermissions.includes(p.id)
                  const Icon = p.icon
                  return (
                    <label
                      key={p.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition ${
                        isChecked
                          ? 'bg-slate-50 dark:bg-slate-800 border-primary/50 text-slate-900 dark:text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(p.id, editPermissions, setEditPermissions)}
                          className="rounded text-primary focus:ring-primary w-4 h-4"
                        />
                        <Icon className="w-4 h-4 text-primary" />
                        <div>
                          <div className="font-bold">{p.label}</div>
                          <div className="text-[10px] text-slate-400">{p.desc}</div>
                        </div>
                      </div>
                    </label>
                  )
                })}
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit || editPermissions.length === 0}
                  className="px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {submittingEdit ? 'Saving...' : 'Update Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESET PASSWORD MODAL */}
      {/* ========================================================================= */}
      {showPasswordModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-sm w-full space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  Reset Password
                </h3>
                <p className="text-xs text-slate-400">{selectedStaff.full_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Enter New Password *
                </label>
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-mono text-slate-900 dark:text-white"
                  required
                  minLength={6}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPassword || newPassword.length < 6}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {submittingPassword ? 'Saving...' : 'Set Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTIVITY / THINGS DONE MODAL */}
      {/* ========================================================================= */}
      {showActivityModal && selectedStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl max-w-3xl w-full space-y-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    Things Done by {selectedStaff.full_name}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {selectedStaff.role}
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{selectedStaff.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Tabs: Billing vs Services */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setActivityTab('billing')}
                className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
                  activityTab === 'billing'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Invoices Generated ({activityData?.summary?.total_invoices || selectedStaff.stats.invoices_count})</span>
              </button>

              <button
                type="button"
                onClick={() => setActivityTab('services')}
                className={`py-2 px-4 text-xs font-bold border-b-2 flex items-center gap-1.5 transition ${
                  activityTab === 'services'
                    ? 'border-orange-600 text-orange-600 dark:text-orange-400'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Service Jobs Handled ({activityData?.summary?.total_services || selectedStaff.stats.services_count})</span>
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto space-y-3">
              {activityLoading ? (
                <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  <span>Loading activity log...</span>
                </div>
              ) : activityTab === 'billing' ? (
                activityData?.invoices?.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No invoices generated by this staff member yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 font-semibold uppercase">
                        <tr>
                          <th className="p-3 pl-4">Invoice #</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3 text-right">Amount</th>
                          <th className="p-3">Payment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activityData?.invoices?.map((inv: any) => (
                          <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="p-3 pl-4 font-mono font-bold text-primary">{inv.invoice_number}</td>
                            <td className="p-3 text-slate-500">{new Date(inv.invoice_date).toLocaleDateString('en-IN')}</td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                              {inv.customers?.customer_name || 'Walk-in'}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              ₹{parseFloat(inv.total_grand_amount).toFixed(2)}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                {inv.payment_method}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                activityData?.services?.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400">
                    No service jobs handled by this staff member yet.
                  </div>
                ) : (
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500 font-semibold uppercase">
                        <tr>
                          <th className="p-3 pl-4">Job Ref #</th>
                          <th className="p-3">Date</th>
                          <th className="p-3">Device</th>
                          <th className="p-3">Customer</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Cost</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {activityData?.services?.map((srv: any) => (
                          <tr key={srv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                            <td className="p-3 pl-4 font-mono font-bold text-orange-600">{srv.service_ref_number}</td>
                            <td className="p-3 text-slate-500">{new Date(srv.created_at).toLocaleDateString('en-IN')}</td>
                            <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                              {srv.company_brand} {srv.model} ({srv.device_type})
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-300">
                              {srv.customers?.customer_name || 'Customer'}
                            </td>
                            <td className="p-3">
                              <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                {srv.status}
                              </span>
                            </td>
                            <td className="p-3 text-right font-mono font-bold">
                              ₹{parseFloat(srv.estimated_cost || 0).toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
