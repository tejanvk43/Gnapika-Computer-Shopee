// app/api/attendance/route.ts
import { NextResponse } from 'next/server'
import { getCurrentUserContext } from '@/lib/auth'
import {
  getStaffList,
  getDailyAttendance,
  saveDailyAttendance,
  getMonthlyAttendanceReport,
} from '@/lib/attendance'

export async function GET(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Owner only restriction
    if (!context.isOwner) {
      return NextResponse.json(
        { error: 'Access Denied: Attendance management is reserved for the shop owner.' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date')
    const year = searchParams.get('year')
    const month = searchParams.get('month')

    const staff = await getStaffList(context.organization_id)

    if (year && month) {
      const report = await getMonthlyAttendanceReport(
        context.organization_id,
        parseInt(year, 10),
        parseInt(month, 10)
      )
      return NextResponse.json({
        type: 'monthly',
        staff,
        report,
      })
    }

    // Default to daily attendance
    const todayStr = date || new Date().toISOString().slice(0, 10)
    const records = await getDailyAttendance(context.organization_id, todayStr)

    return NextResponse.json({
      type: 'daily',
      date: todayStr,
      staff,
      records,
    })
  } catch (error: any) {
    console.error('Error in attendance API GET:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const context = await getCurrentUserContext()
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!context.isOwner) {
      return NextResponse.json(
        { error: 'Access Denied: Only the shop owner can mark or update attendance.' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { date, records } = body

    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Date and staff attendance records are required.' },
        { status: 400 }
      )
    }

    // Security requirement: Past attendance records cannot be edited
    const now = new Date()
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    if (date < todayStr) {
      return NextResponse.json(
        { error: 'Security Restriction: Past attendance records are locked and cannot be edited.' },
        { status: 403 }
      )
    }

    await saveDailyAttendance(records, context.organization_id, date, context.user.id)

    return NextResponse.json({
      success: true,
      message: `Attendance for ${date} saved successfully.`,
    })
  } catch (error: any) {
    console.error('Error in attendance API POST:', error)
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 })
  }
}
