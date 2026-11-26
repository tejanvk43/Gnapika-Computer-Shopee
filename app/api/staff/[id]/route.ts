// app/api/staff/[id]/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!context.isOwner) {
      return NextResponse.json({ error: "Access denied. Only shop owners can update staff." }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const staffId = resolvedParams.id

    const body = await request.json()
    const { full_name, permissions, role, password } = body

    // 1. Fetch existing user metadata
    const { data: userResp, error: fetchErr } = await supabaseService.auth.admin.getUserById(staffId)
    if (fetchErr || !userResp?.user) {
      return NextResponse.json({ error: "Staff member not found." }, { status: 404 })
    }

    const existingMeta = userResp.user.user_metadata || {}
    const updatedMeta = {
      ...existingMeta,
      ...(full_name ? { full_name: full_name.trim() } : {}),
      ...(role ? { role } : {}),
      ...(Array.isArray(permissions) ? { permissions } : {}),
      updated_at: new Date().toISOString(),
    }

    // 2. Prepare admin update payload
    const updatePayload: any = {
      user_metadata: updatedMeta,
    }
    if (password && password.trim().length >= 6) {
      updatePayload.password = password.trim()
    }

    const { data: updatedAuthUser, error: updateErr } = await supabaseService.auth.admin.updateUserById(
      staffId,
      updatePayload
    )

    if (updateErr) {
      console.error("Error updating staff auth:", updateErr)
      throw new Error(updateErr.message || "Failed to update staff credentials.")
    }

    // 3. Update user_profiles
    if (full_name) {
      await supabaseService
        .from('user_profiles')
        .update({ full_name: full_name.trim() })
        .eq('id', staffId)
        .eq('organization_id', context.organization_id)
    }

    // 4. Update organization_memberships if role changed
    if (role) {
      await supabaseService
        .from('organization_memberships')
        .update({ role: role === 'Owner' ? 'Owner' : 'Admin' })
        .eq('user_profile_id', staffId)
        .eq('organization_id', context.organization_id)
    }

    return NextResponse.json({
      success: true,
      message: "Staff member updated successfully.",
      user: {
        id: staffId,
        full_name: updatedMeta.full_name,
        role: updatedMeta.role,
        permissions: updatedMeta.permissions,
      },
    })
  } catch (err: any) {
    console.error("Update staff error:", err)
    return NextResponse.json({ error: err.message || "Failed to update staff." }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!context.isOwner) {
      return NextResponse.json({ error: "Access denied. Only shop owners can remove staff." }, { status: 403 })
    }

    const resolvedParams = await Promise.resolve(params)
    const staffId = resolvedParams.id

    if (staffId === context.user.id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 })
    }

    // 1. Delete from auth.users (cascades or removes access)
    const { error: delErr } = await supabaseService.auth.admin.deleteUser(staffId)
    if (delErr) {
      console.error("Error deleting staff auth user:", delErr)
      throw new Error(delErr.message || "Failed to delete user.")
    }

    // 2. Remove profile and membership
    await supabaseService.from('organization_memberships').delete().eq('user_profile_id', staffId)
    await supabaseService.from('user_profiles').delete().eq('id', staffId)

    return NextResponse.json({
      success: true,
      message: "Staff member removed successfully.",
    })
  } catch (err: any) {
    console.error("Delete staff error:", err)
    return NextResponse.json({ error: err.message || "Failed to delete staff." }, { status: 500 })
  }
}
