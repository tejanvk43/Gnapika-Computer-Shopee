'use client'

import React, { useState, useEffect } from 'react'
import { StaffMember, AttendanceRecord, AttendanceStatus } from '@/lib/attendance'
import {
  CalendarCheck,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Save,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  AlertCircle,
  Coffee,
  Lock,
  SlidersHorizontal,
  Zap,
} from 'lucide-react'

interface AttendanceProps {
  staffList: StaffMember[]
  initialDate: string
  initialRecords: AttendanceRecord[]
}

export function AttendanceManagementDashboard({
  staffList,
  initialDate,
  initialRecords,
}: AttendanceProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'monthly'>('daily')

  // Helper for local date string (YYYY-MM-DD)
  const getTodayDateStr = () => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  }
  const todayStr = getTodayDateStr()

  // Daily State
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [showAdvancedTimes, setShowAdvancedTimes] = useState(false)
  const [attendanceMap, setAttendanceMap] = useState<
    Record<string, { status: AttendanceStatus; checkIn: string; checkOut: string; notes: string }>
  >({})
  const [savingDaily, setSavingDaily] = useState(false)
  const [dailyFeedback, setDailyFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  )

  const isPastDate = selectedDate < todayStr
  const isToday = selectedDate === todayStr
  const isFutureDate = selectedDate > todayStr

  // Monthly State
  const today = new Date()
  const [monthlyYear, setMonthlyYear] = useState(today.getFullYear())
  const [monthlyMonth, setMonthlyMonth] = useState(today.getMonth() + 1)
  const [monthlyData, setMonthlyData] = useState<any | null>(null)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  // Initialize daily records mapping
  useEffect(() => {
    const map: Record<
      string,
      { status: AttendanceStatus; checkIn: string; checkOut: string; notes: string }
    > = {}

    for (const staff of staffList) {
      const existing = initialRecords.find((r) => r.user_profile_id === staff.id)
      map[staff.id] = {
        status: existing?.status || 'Present',
        checkIn: existing?.check_in_time || '09:30 AM',
        checkOut: existing?.check_out_time || '08:30 PM',
        notes: existing?.notes || '',
      }
    }
    setAttendanceMap(map)
  }, [staffList, initialRecords])

  // Fetch daily attendance when selectedDate changes
  const fetchDateAttendance = async (dateStr: string) => {
    setSelectedDate(dateStr)
    setDailyFeedback(null)
    try {
      const res = await fetch(`/api/attendance?date=${dateStr}`)
      const json = await res.json()
      if (res.ok && json.records) {
        const map: Record<
          string,
          { status: AttendanceStatus; checkIn: string; checkOut: string; notes: string }
        > = {}

        for (const staff of staffList) {
          const found = (json.records as AttendanceRecord[]).find((r) => r.user_profile_id === staff.id)
          map[staff.id] = {
            status: found?.status || 'Present',
            checkIn: found?.check_in_time || '09:30 AM',
            checkOut: found?.check_out_time || '08:30 PM',
            notes: found?.notes || '',
          }
        }
        setAttendanceMap(map)
      }
    } catch (err) {
      console.error('Error fetching date attendance:', err)
    }
  }

  // Fetch monthly report
  const fetchMonthlyReport = async (yr: number, mo: number) => {
    setLoadingMonthly(true)
    try {
      const res = await fetch(`/api/attendance?year=${yr}&month=${mo}`)
      const json = await res.json()
      if (res.ok && json.report) {
        setMonthlyData(json.report)
      }
    } catch (err) {
      console.error('Error fetching monthly report:', err)
    } finally {
      setLoadingMonthly(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'monthly') {
      fetchMonthlyReport(monthlyYear, monthlyMonth)
    }
  }, [activeTab, monthlyYear, monthlyMonth])

  // Save Daily Attendance
  const handleSaveDaily = async () => {
    if (isPastDate) {
      setDailyFeedback({
        type: 'error',
        message: 'Security Restriction: Past attendance records are locked and cannot be edited.',
      })
      return
    }

    setSavingDaily(true)
    setDailyFeedback(null)

    const payload = {
      date: selectedDate,
      records: staffList.map((staff) => {
        const current = attendanceMap[staff.id] || {
          status: 'Present' as AttendanceStatus,
          checkIn: '',
          checkOut: '',
          notes: '',
        }
        return {
          user_profile_id: staff.id,
          status: current.status,
          check_in_time: current.checkIn,
          check_out_time: current.checkOut,
          notes: current.notes,
        }
      }),
    }

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to save attendance')
      }

      setDailyFeedback({ type: 'success', message: `Attendance for ${selectedDate} saved successfully!` })
    } catch (err: any) {
      setDailyFeedback({ type: 'error', message: err.message || 'Error saving attendance.' })
    } finally {
      setSavingDaily(false)
    }
  }

  // Bulk: Mark All Present
  const handleMarkAllPresent = () => {
    if (isPastDate) return
    const updated = { ...attendanceMap }
    for (const s of staffList) {
      updated[s.id] = {
        ...(updated[s.id] || {}),
        status: 'Present',
        checkIn: updated[s.id]?.checkIn || '09:30 AM',
        checkOut: updated[s.id]?.checkOut || '08:30 PM',
        notes: updated[s.id]?.notes || '',
      }
    }
    setAttendanceMap(updated)
  }

  // Change individual staff status
  const handleStatusChange = (staffId: string, status: AttendanceStatus) => {
    if (isPastDate) return
    setAttendanceMap((prev) => ({
      ...prev,
      [staffId]: {
        ...(prev[staffId] || { checkIn: '', checkOut: '', notes: '' }),
        status,
      },
    }))
  }

  // Shift dates
  const handleDateShift = (days: number) => {
    const cur = new Date(selectedDate)
    cur.setDate(cur.getDate() + days)
    const nextDate = cur.toISOString().slice(0, 10)
    fetchDateAttendance(nextDate)
  }

  // Calculate daily stats
  const dailyRecordsList = Object.values(attendanceMap)
  const presentCount = dailyRecordsList.filter((r) => r.status === 'Present').length
  const halfDayCount = dailyRecordsList.filter((r) => r.status === 'Half Day').length
  const absentCount = dailyRecordsList.filter((r) => r.status === 'Absent').length
  const leaveCount = dailyRecordsList.filter((r) => r.status === 'Leave').length

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Staff Attendance Management
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary">
              Owner Portal
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Maintain daily staff attendance, record check-in/out times, and view monthly registers
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-slate-800 self-start sm:self-center">
          <button
            type="button"
            onClick={() => setActiveTab('daily')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'daily'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Daily Attendance
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'monthly'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Monthly Register
          </button>
        </div>
      </div>

      {dailyFeedback && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 ${
            dailyFeedback.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}
        >
          {dailyFeedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{dailyFeedback.message}</span>
        </div>
      )}

      {/* TAB 1: DAILY ATTENDANCE */}
      {activeTab === 'daily' && (
        <div className="space-y-6">
          {/* Security Alert for Past Dates */}
          {isPastDate && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-amber-950 dark:text-amber-100 flex items-center gap-2">
                    <span>Past Record Locked &amp; Secured</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200/80 dark:bg-amber-900/80 uppercase">
                      Read-Only
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                    Attendance records for past dates are permanently locked to preserve audit integrity and prevent unauthorized changes.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => fetchDateAttendance(todayStr)}
                className="self-start sm:self-center px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-sm shrink-0"
              >
                Go to Today
              </button>
            </div>
          )}

          {/* Date Selector & Action Bar */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleDateShift(-1)}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <div className="flex items-center gap-1.5 px-2">
                  <Calendar className="w-4 h-4 text-primary shrink-0" />
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => fetchDateAttendance(e.target.value)}
                    className="text-xs font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleDateShift(1)}
                  className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition"
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Date Status Badges */}
              {isToday && (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                  Today
                </span>
              )}
              {isPastDate && (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Locked
                </span>
              )}
              {isFutureDate && (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800">
                  Future Date
                </span>
              )}

              {!isToday && (
                <button
                  type="button"
                  onClick={() => fetchDateAttendance(todayStr)}
                  className="px-2.5 py-1 text-xs font-semibold text-primary hover:underline"
                >
                  Return to Today
                </button>
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle Detail Mode */}
              <button
                type="button"
                onClick={() => setShowAdvancedTimes((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  showAdvancedTimes
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600'
                    : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-900'
                }`}
                title="Toggle check-in times and remarks"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{showAdvancedTimes ? 'Quick Mode' : 'Times & Notes'}</span>
              </button>

              {!isPastDate ? (
                <>
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 text-xs font-bold transition shadow-sm"
                  >
                    <Zap className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Mark All Present</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveDaily}
                    disabled={savingDaily}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/20 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingDaily ? 'Saving...' : 'Save Attendance'}</span>
                  </button>
                </>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700">
                  <Lock className="w-3.5 h-3.5 text-amber-500" />
                  <span>Record Locked (Read-Only)</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Present</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                {presentCount}
              </div>
              <div className="text-[11px] text-slate-400">Full day present</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Half Day</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                {halfDayCount}
              </div>
              <div className="text-[11px] text-slate-400">Half day shifts</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Absent</span>
                <XCircle className="w-4 h-4 text-red-500" />
              </div>
              <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">
                {absentCount}
              </div>
              <div className="text-[11px] text-slate-400">Unexcused absent</div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>On Leave</span>
                <Coffee className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                {leaveCount}
              </div>
              <div className="text-[11px] text-slate-400">Permitted leaves</div>
            </div>
          </div>

          {/* Staff Daily Table */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Staff Members ({staffList.length})
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-mono text-slate-500">Date: {selectedDate}</span>
                {isPastDate && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
                    <Lock className="w-3 h-3" /> Locked
                  </span>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 font-semibold">
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4 text-center">Attendance Status</th>
                    {showAdvancedTimes && (
                      <>
                        <th className="py-3 px-4 w-32">Check In</th>
                        <th className="py-3 px-4 w-32">Check Out</th>
                        <th className="py-3 px-4">Notes / Remarks</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {staffList.map((staff) => {
                    const current = attendanceMap[staff.id] || {
                      status: 'Present' as AttendanceStatus,
                      checkIn: '',
                      checkOut: '',
                      notes: '',
                    }

                    return (
                      <tr key={staff.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {staff.full_name}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{staff.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            {staff.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isPastDate ? (
                            // Read-only status badge when locked
                            <div className="flex justify-center">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
                                  current.status === 'Present'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                    : current.status === 'Half Day'
                                    ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                    : current.status === 'Absent'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-300 dark:border-red-800'
                                    : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-800'
                                }`}
                              >
                                <Lock className="w-3 h-3 opacity-60" />
                                {current.status}
                              </span>
                            </div>
                          ) : (
                            // Interactive fast toggle pills
                            <div className="inline-flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1">
                              {(['Present', 'Half Day', 'Absent', 'Leave'] as AttendanceStatus[]).map(
                                (status) => {
                                  const active = current.status === status
                                  let activeClass =
                                    'bg-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                  if (active) {
                                    if (status === 'Present')
                                      activeClass =
                                        'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30 font-bold'
                                    if (status === 'Half Day')
                                      activeClass =
                                        'bg-amber-500 text-white shadow-sm shadow-amber-500/30 font-bold'
                                    if (status === 'Absent')
                                      activeClass =
                                        'bg-red-600 text-white shadow-sm shadow-red-600/30 font-bold'
                                    if (status === 'Leave')
                                      activeClass =
                                        'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold'
                                  }

                                  return (
                                    <button
                                      key={status}
                                      type="button"
                                      onClick={() => handleStatusChange(staff.id, status)}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${activeClass}`}
                                    >
                                      {status}
                                    </button>
                                  )
                                }
                              )}
                            </div>
                          )}
                        </td>

                        {showAdvancedTimes && (
                          <>
                            <td className="py-3.5 px-4">
                              <input
                                type="text"
                                value={current.checkIn}
                                disabled={isPastDate}
                                onChange={(e) =>
                                  setAttendanceMap((prev) => ({
                                    ...prev,
                                    [staff.id]: { ...(prev[staff.id] || {}), checkIn: e.target.value },
                                  }))
                                }
                                placeholder="09:30 AM"
                                className={`w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 ${
                                  isPastDate
                                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white'
                                }`}
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <input
                                type="text"
                                value={current.checkOut}
                                disabled={isPastDate}
                                onChange={(e) =>
                                  setAttendanceMap((prev) => ({
                                    ...prev,
                                    [staff.id]: { ...(prev[staff.id] || {}), checkOut: e.target.value },
                                  }))
                                }
                                placeholder="08:30 PM"
                                className={`w-full px-2.5 py-1 text-xs font-mono rounded-lg border border-slate-200 dark:border-slate-800 ${
                                  isPastDate
                                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white'
                                }`}
                              />
                            </td>
                            <td className="py-3.5 px-4">
                              <input
                                type="text"
                                value={current.notes}
                                disabled={isPastDate}
                                onChange={(e) =>
                                  setAttendanceMap((prev) => ({
                                    ...prev,
                                    [staff.id]: { ...(prev[staff.id] || {}), notes: e.target.value },
                                  }))
                                }
                                placeholder="Optional remark..."
                                className={`w-full px-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 ${
                                  isPastDate
                                    ? 'bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed'
                                    : 'bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white'
                                }`}
                              />
                            </td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              {isPastDate ? (
                <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400 font-medium">
                  <Lock className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Past attendance records are locked and secured. Edits are disabled.</span>
                </div>
              ) : (
                <div className="text-xs text-slate-500">
                  Click <strong>Mark All Present</strong> to set all staff, or click individual statuses.
                </div>
              )}

              {!isPastDate && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleMarkAllPresent}
                    className="px-3 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-bold transition"
                  >
                    Mark All Present
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDaily}
                    disabled={savingDaily}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary/90 text-white text-xs font-bold shadow-md shadow-primary/20 transition disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingDaily ? 'Saving...' : 'Save Daily Attendance'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MONTHLY REGISTER & SUMMARY */}
      {activeTab === 'monthly' && (
        <div className="space-y-6">
          {/* Month Selector Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Monthly Register Period
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {months.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={monthlyYear}
                onChange={(e) => setMonthlyYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
              >
                {[2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => fetchMonthlyReport(monthlyYear, monthlyMonth)}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold transition ml-2"
              >
                Refresh
              </button>
            </div>
          </div>

          {loadingMonthly ? (
            <div className="py-16 text-center text-xs text-slate-500">
              Loading monthly register...
            </div>
          ) : monthlyData?.summary ? (
            <div className="space-y-6">
              {/* Monthly Stats Summary Table */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Monthly Performance &amp; Attendance Rate
                  </h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-800/40 text-slate-500 font-semibold">
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Role</th>
                        <th className="py-3 px-4 text-center">Present</th>
                        <th className="py-3 px-4 text-center">Half Day</th>
                        <th className="py-3 px-4 text-center">Absent</th>
                        <th className="py-3 px-4 text-center">Leave</th>
                        <th className="py-3 px-4 w-44">Attendance %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {monthlyData.summary.map((row: any) => (
                        <tr key={row.staff.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                            {row.staff.full_name}
                          </td>
                          <td className="py-3.5 px-4 text-slate-500">{row.staff.role}</td>
                          <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                            {row.presentCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-amber-600">
                            {row.halfDayCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-red-600">
                            {row.absentCount}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-indigo-600">
                            {row.leaveCount}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    row.percentage >= 85
                                      ? 'bg-emerald-500'
                                      : row.percentage >= 70
                                      ? 'bg-amber-500'
                                      : 'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(100, row.percentage)}%` }}
                                />
                              </div>
                              <span className="font-mono font-bold text-xs text-slate-700 dark:text-slate-300 w-9 text-right">
                                {row.percentage}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Day-by-Day Calendar Matrix */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-sm overflow-hidden">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Day-by-Day Register (1 - {monthlyData.daysInMonth})
                  </h3>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> P (Present)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> H (Half Day)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> A (Absent)
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> L (Leave)
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-center text-[10px] border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-mono">
                        <th className="py-2 px-2 text-left w-36">Staff</th>
                        {Array.from({ length: monthlyData.daysInMonth }, (_, i) => i + 1).map((d) => (
                          <th key={d} className="py-2 px-1 w-6">
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {monthlyData.summary.map((row: any) => (
                        <tr key={row.staff.id}>
                          <td className="py-2.5 px-2 text-left font-bold text-slate-800 dark:text-slate-200 truncate max-w-[130px]">
                            {row.staff.full_name}
                          </td>
                          {Array.from({ length: monthlyData.daysInMonth }, (_, i) => i + 1).map((d) => {
                            const status = row.dayMap?.[d] as AttendanceStatus | undefined
                            let badge = (
                              <span className="text-slate-300 dark:text-slate-700 font-mono text-[9px]">-</span>
                            )
                            if (status === 'Present')
                              badge = (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
                                  P
                                </span>
                              )
                            if (status === 'Half Day')
                              badge = (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 font-bold">
                                  H
                                </span>
                              )
                            if (status === 'Absent')
                              badge = (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400 font-bold">
                                  A
                                </span>
                              )
                            if (status === 'Leave')
                              badge = (
                                <span className="inline-block w-5 h-5 leading-5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-bold">
                                  L
                                </span>
                              )

                            return (
                              <td key={d} className="py-2 px-0.5">
                                {badge}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
