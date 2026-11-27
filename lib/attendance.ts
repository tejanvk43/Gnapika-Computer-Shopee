// lib/attendance.ts
import { supabaseService } from './supabase'

export type AttendanceStatus = 'Present' | 'Absent' | 'Half Day' | 'Leave'

export interface AttendanceRecord {
  id?: string
  organization_id: string
  user_profile_id: string
  user_name?: string
  user_email?: string
  role?: string
  attendance_date: string // YYYY-MM-DD
  status: AttendanceStatus
  check_in_time?: string
  check_out_time?: string
  notes?: string
  recorded_by_user_id?: string
  created_at?: string
  updated_at?: string
}

export interface StaffMember {
  id: string
  full_name: string
  email: string
  role: string
}

/**
 * Fetch all staff/users belonging to the organization
 */
export async function getStaffList(organizationId: string): Promise<StaffMember[]> {
  try {
    const { data: memberships, error } = await supabaseService
      .from('organization_memberships')
      .select(`
        role,
        user_profiles (
          id,
          full_name,
          email
        )
      `)
      .eq('organization_id', organizationId)

    if (!error && memberships) {
      return memberships
        .map((m: any) => ({
          id: m.user_profiles?.id,
          full_name: m.user_profiles?.full_name || 'Staff Member',
          email: m.user_profiles?.email || '',
          role: m.role || 'Staff',
        }))
        .filter((s) => Boolean(s.id))
    }
  } catch (err) {
    console.warn('Error fetching staff list for attendance:', err)
  }

  // Fallback to user_profiles directly
  try {
    const { data: profiles } = await supabaseService
      .from('user_profiles')
      .select('id, full_name, email')
      .eq('organization_id', organizationId)

    return (profiles || []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: 'Staff',
    }))
  } catch (err) {
    console.error('Staff fallback error:', err)
    return []
  }
}

/**
 * Fetch daily attendance records for a specific date
 */
export async function getDailyAttendance(
  organizationId: string,
  dateStr: string
): Promise<AttendanceRecord[]> {
  try {
    // 1. Try querying staff_attendance table
    const { data, error } = await supabaseService
      .from('staff_attendance')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('attendance_date', dateStr)

    if (!error && data) {
      return data as AttendanceRecord[]
    }
  } catch (err) {
    console.warn('staff_attendance table notice:', err)
  }

  // 2. Fallback to audit_logs
  try {
    const { data: auditRows } = await supabaseService
      .from('audit_logs')
      .select('details')
      .eq('organization_id', organizationId)
      .eq('action', 'ATTENDANCE_RECORD')

    if (auditRows) {
      const recordsMap = new Map<string, AttendanceRecord>()
      for (const r of auditRows) {
        const item = r.details as AttendanceRecord
        if (item && item.attendance_date === dateStr && item.user_profile_id) {
          recordsMap.set(item.user_profile_id, item)
        }
      }
      return Array.from(recordsMap.values())
    }
  } catch (err) {
    console.error('Audit log attendance fallback error:', err)
  }

  return []
}

/**
 * Save daily attendance for multiple staff members
 */
export async function saveDailyAttendance(
  records: Array<{
    user_profile_id: string
    status: AttendanceStatus
    check_in_time?: string
    check_out_time?: string
    notes?: string
  }>,
  organizationId: string,
  dateStr: string,
  recordedByUserId: string
): Promise<boolean> {
  const preparedRecords: AttendanceRecord[] = records.map((r) => ({
    id: crypto.randomUUID(),
    organization_id: organizationId,
    user_profile_id: r.user_profile_id,
    attendance_date: dateStr,
    status: r.status,
    check_in_time: r.check_in_time || '',
    check_out_time: r.check_out_time || '',
    notes: r.notes || '',
    recorded_by_user_id: recordedByUserId,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }))

  // 1. Try upserting to staff_attendance table
  try {
    const { error } = await supabaseService
      .from('staff_attendance')
      .upsert(preparedRecords, { onConflict: 'organization_id,user_profile_id,attendance_date' })

    if (!error) {
      console.log('Saved attendance to staff_attendance table')
    }
  } catch (err) {
    console.warn('staff_attendance table write notice:', err)
  }

  // 2. Always backup to audit_logs for zero-downtime reliability
  try {
    for (const rec of preparedRecords) {
      await supabaseService.from('audit_logs').insert([
        {
          organization_id: organizationId,
          user_id: recordedByUserId,
          action: 'ATTENDANCE_RECORD',
          entity_type: 'ATTENDANCE',
          details: rec,
        },
      ])
    }
  } catch (err) {
    console.error('Error saving attendance audit backup:', err)
  }

  return true
}

/**
 * Fetch monthly attendance summary for all staff members
 */
export async function getMonthlyAttendanceReport(
  organizationId: string,
  year: number,
  month: number // 1 to 12
) {
  const staff = await getStaffList(organizationId)

  const monthStr = month < 10 ? `0${month}` : `${month}`
  const startDate = `${year}-${monthStr}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const endDate = `${year}-${monthStr}-${lastDay}`

  let rawRecords: AttendanceRecord[] = []

  // Try staff_attendance table
  try {
    const { data, error } = await supabaseService
      .from('staff_attendance')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)

    if (!error && data) {
      rawRecords = data as AttendanceRecord[]
    }
  } catch (err) {
    console.warn('Monthly attendance query notice:', err)
  }

  // Fallback audit_logs check if empty
  if (rawRecords.length === 0) {
    try {
      const { data: auditRows } = await supabaseService
        .from('audit_logs')
        .select('details')
        .eq('organization_id', organizationId)
        .eq('action', 'ATTENDANCE_RECORD')

      if (auditRows) {
        const uniqueMap = new Map<string, AttendanceRecord>()
        for (const row of auditRows) {
          const item = row.details as AttendanceRecord
          if (
            item &&
            item.attendance_date &&
            item.attendance_date >= startDate &&
            item.attendance_date <= endDate
          ) {
            const key = `${item.user_profile_id}_${item.attendance_date}`
            uniqueMap.set(key, item)
          }
        }
        rawRecords = Array.from(uniqueMap.values())
      }
    } catch (err) {
      console.error('Audit log monthly fallback error:', err)
    }
  }

  // Compute stats per staff member
  const summary = staff.map((s) => {
    const staffRecords = rawRecords.filter((r) => r.user_profile_id === s.id)
    const presentCount = staffRecords.filter((r) => r.status === 'Present').length
    const halfDayCount = staffRecords.filter((r) => r.status === 'Half Day').length
    const absentCount = staffRecords.filter((r) => r.status === 'Absent').length
    const leaveCount = staffRecords.filter((r) => r.status === 'Leave').length

    const effectivePresent = presentCount + halfDayCount * 0.5
    const totalMarked = staffRecords.length
    const percentage = totalMarked > 0 ? Math.round((effectivePresent / totalMarked) * 100) : 0

    // Day-by-day mapping { '1': 'Present', '2': 'Absent', ... }
    const dayMap: Record<number, AttendanceStatus> = {}
    for (const r of staffRecords) {
      const dayNum = parseInt(r.attendance_date.split('-')[2], 10)
      if (!isNaN(dayNum)) {
        dayMap[dayNum] = r.status
      }
    }

    return {
      staff: s,
      presentCount,
      halfDayCount,
      absentCount,
      leaveCount,
      effectivePresent,
      totalMarked,
      percentage,
      dayMap,
    }
  })

  return {
    year,
    month,
    daysInMonth: lastDay,
    summary,
  }
}
