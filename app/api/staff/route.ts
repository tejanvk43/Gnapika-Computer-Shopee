// app/api/staff/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!context.isOwner) {
      return NextResponse.json({ error: "Access denied. Only shop owners can view staff." }, { status: 403 })
    }

    // 1. Fetch user profiles in this organization
    const { data: profiles, error: pErr } = await supabaseService
      .from('user_profiles')
      .select('id, email, full_name, created_at, organization_id')
      .eq('organization_id', context.organization_id)
      .order('created_at', { ascending: true })

    if (pErr) throw pErr

    // 2. Fetch memberships for roles
    const { data: memberships } = await supabaseService
      .from('organization_memberships')
      .select('user_profile_id, role')
      .eq('organization_id', context.organization_id)

    const membershipMap = new Map((memberships || []).map((m) => [m.user_profile_id, m.role]))

    // 3. Fetch Auth Users to get metadata (permissions, active status)
    const { data: authData } = await supabaseService.auth.admin.listUsers({ perPage: 100 })
    const authMap = new Map((authData?.users || []).map((u) => [u.id, u]))

    // 4. Fetch activity aggregation (invoices created by each user)
    const { data: invoices } = await supabaseService
      .from('invoices')
      .select('created_by_user_id, total_grand_amount')
      .eq('organization_id', context.organization_id)

    const invoiceStatsMap = new Map<string, { count: number; totalSales: number }>()
    for (const inv of invoices || []) {
      const uId = inv.created_by_user_id || 'unknown'
      const cur = invoiceStatsMap.get(uId) || { count: 0, totalSales: 0 }
      cur.count += 1
      cur.totalSales += parseFloat(inv.total_grand_amount) || 0
      invoiceStatsMap.set(uId, cur)
    }

    // 5. Fetch activity aggregation (service jobs assigned or created)
    const { data: serviceJobs } = await supabaseService
      .from('service_jobs')
      .select('assigned_technician_id, status')
      .eq('organization_id', context.organization_id)

    const serviceStatsMap = new Map<string, { count: number; completedCount: number }>()
    for (const srv of serviceJobs || []) {
      const uId = srv.assigned_technician_id || 'unknown'
      const cur = serviceStatsMap.get(uId) || { count: 0, completedCount: 0 }
      cur.count += 1
      if (srv.status === 'Completed' || srv.status === 'Delivered') {
        cur.completedCount += 1
      }
      serviceStatsMap.set(uId, cur)
    }

    // 6. Build final staff list
    const staffList = (profiles || []).map((p) => {
      const authUser = authMap.get(p.id)
      const role = membershipMap.get(p.id) || authUser?.user_metadata?.role || (p.id === context.user.id ? 'Owner' : 'Staff')
      const isOwner = role === 'Owner'
      const permissions: string[] = isOwner
        ? ['*']
        : Array.isArray(authUser?.user_metadata?.permissions)
        ? authUser.user_metadata.permissions
        : ['billing', 'services']

      const invStat = invoiceStatsMap.get(p.id) || { count: 0, totalSales: 0 }
      const srvStat = serviceStatsMap.get(p.id) || { count: 0, completedCount: 0 }

      return {
        id: p.id,
        email: p.email,
        full_name: authUser?.user_metadata?.full_name || p.full_name || 'Staff Member',
        role,
        is_owner: isOwner,
        permissions,
        created_at: p.created_at,
        is_current_user: p.id === context.user.id,
        stats: {
          invoices_count: invStat.count,
          total_sales: Math.round(invStat.totalSales * 100) / 100,
          services_count: srvStat.count,
          services_completed: srvStat.completedCount,
        },
      }
    })

    return NextResponse.json({ staff: staffList })
  } catch (err: any) {
    console.error("Staff list error:", err)
    return NextResponse.json({ error: err.message || "Failed to fetch staff" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!context.isOwner) {
      return NextResponse.json({ error: "Access denied. Only shop owners can add staff." }, { status: 403 })
    }

    const body = await request.json()
    const {
      full_name,
      email,
      password,
      permissions = ['billing', 'services'],
      role = 'Staff',
    } = body

    if (!full_name?.trim()) {
      return NextResponse.json({ error: "Staff full name is required." }, { status: 400 })
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: "Staff email address is required." }, { status: 400 })
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters long." }, { status: 400 })
    }
    if (!Array.isArray(permissions) || permissions.length === 0) {
      return NextResponse.json({ error: "At least one permission (e.g. billing or services) must be selected." }, { status: 400 })
    }

    // 1. Create Auth User using Supabase Admin
    const { data: newUser, error: createAuthErr } = await supabaseService.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role,
        permissions,
        created_by_owner_id: context.user.id,
        created_at: new Date().toISOString(),
      },
    })

    if (createAuthErr || !newUser?.user) {
      console.error("Error creating auth user for staff:", createAuthErr)
      throw new Error(createAuthErr?.message || "Failed to create user credentials.")
    }

    const userId = newUser.user.id

    // 2. Upsert into user_profiles
    const { error: profErr } = await supabaseService
      .from('user_profiles')
      .upsert({
        id: userId,
        organization_id: context.organization_id,
        email: email.trim().toLowerCase(),
        full_name: full_name.trim(),
      }, { onConflict: 'id' })

    if (profErr) {
      console.warn("Notice: user_profile upsert error:", profErr)
    }

    // 3. Insert into organization_memberships
    const { error: memErr } = await supabaseService
      .from('organization_memberships')
      .upsert({
        user_profile_id: userId,
        organization_id: context.organization_id,
        role: role === 'Owner' ? 'Owner' : 'Admin',
      }, { onConflict: 'user_profile_id,organization_id' })

    if (memErr) {
      console.warn("Notice: membership upsert error:", memErr)
    }

    return NextResponse.json({
      success: true,
      message: `Staff member "${full_name}" added successfully with access: ${permissions.join(', ')}`,
      user: {
        id: userId,
        email: email.trim(),
        full_name: full_name.trim(),
        role,
        permissions,
      },
    }, { status: 201 })
  } catch (err: any) {
    console.error("Create staff error:", err)
    return NextResponse.json({ error: err.message || "Failed to create staff member." }, { status: 500 })
  }
}
