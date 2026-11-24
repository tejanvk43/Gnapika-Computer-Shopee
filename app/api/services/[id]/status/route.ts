// app/api/services/[id]/status/route.ts
import { NextResponse } from 'next/server'
import { supabaseService } from '@/lib/supabase'
import { getCurrentUserContext } from '@/lib/auth'

const statusFlow = [
  'Received',
  'In Progress',
  'Completed',
]

export async function POST(
  request: Request,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    const context = await getCurrentUserContext()
    if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const resolvedParams = await Promise.resolve(params)
    const id = resolvedParams.id

    // Check content-type to handle both JSON and Form Data safely
    let next_status: string | null = null
    let notes: string | null = null
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      const body = await request.json()
      next_status = body.next_status
      notes = body.notes
    } else {
      const formData = await request.formData()
      next_status = formData.get('next_status') as string
      notes = formData.get('notes') as string
    }

    if (!next_status) {
      return NextResponse.json({ error: "next_status is required." }, { status: 400 })
    }

    // Validate status transition
    const currentService = await supabaseService
      .from('service_jobs')
      .select('status')
      .eq('id', id)
      .eq('organization_id', context.organization_id)
      .single()

    if (currentService.error) throw currentService.error

    const nextIndex = statusFlow.indexOf(next_status)
    if (nextIndex < 0) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 })
    }

    // Update service job status (service_jobs schema has status without updated_at)
    const { data: updatedService, error } = await supabaseService
      .from('service_jobs')
      .update({ status: next_status })
      .eq('id', id)
      .eq('organization_id', context.organization_id)
      .select()
      .single()

    if (error) throw error

    // Add to status history
    await supabaseService
      .from('service_status_history')
      .insert([{
        service_job_id: id,
        status_changed_to: next_status,
        notes: notes || `Status changed to ${next_status}`,
        changed_at: new Date().toISOString(),
      }])

    // If submitted via standard HTML Form, redirect back to service detail page
    if (!contentType.includes('application/json')) {
      return NextResponse.redirect(new URL(`/dashboard/services/${id}`, request.url), 303)
    }

    return NextResponse.json(updatedService)
  } catch (error: any) {
    console.error("Service status update error:", error)
    return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 })
  }
}