// app/api/public/upload/route.ts
import { NextResponse } from 'next/server'
import { uploadToCloudflareStorage } from '@/lib/cloudflareStorage'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || ''

    // 1. Handle multipart form data
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData()
      const file = formData.get('file') as File | null

      if (!file) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 })
      }

      const buffer = Buffer.from(await file.arrayBuffer())
      const result = await uploadToCloudflareStorage(buffer, file.name, file.type || 'application/octet-stream')
      return NextResponse.json(result)
    }

    // 2. Handle base64 JSON payload
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { base64, fileName, mimeType } = body

      if (!base64) {
        return NextResponse.json({ error: 'No base64 data provided' }, { status: 400 })
      }

      const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '')
      const buffer = Buffer.from(cleanBase64, 'base64')
      const result = await uploadToCloudflareStorage(
        buffer,
        fileName || 'upload.bin',
        mimeType || 'application/octet-stream'
      )
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unsupported Content-Type' }, { status: 400 })
  } catch (error: any) {
    console.error('File upload error:', error)
    return NextResponse.json({ error: error?.message || 'Upload failed' }, { status: 500 })
  }
}
