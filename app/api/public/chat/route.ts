// app/api/public/chat/route.ts
import { NextResponse } from 'next/server'
import { sendChatMessage, getChatMessages, getServiceRequestById } from '@/lib/customerRequests'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const requestId =
      searchParams.get('requestId') ||
      searchParams.get('request_id') ||
      searchParams.get('service_request_id')

    if (!requestId) {
      return NextResponse.json({ error: 'requestId parameter is required' }, { status: 400 })
    }

    const messages = await getChatMessages(requestId)
    const serviceRequest = await getServiceRequestById(requestId)

    return NextResponse.json({
      messages,
      requestStatus: serviceRequest?.status || 'pending',
      serviceRequest,
    })
  } catch (error: any) {
    console.error('Chat messages fetch error:', error)
    return NextResponse.json({ error: error?.message || 'Failed fetching messages' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const targetRequestId = body.request_id || body.service_request_id || body.requestId
    const targetSenderType = body.sender_type || (body.sender_role === 'customer' ? 'customer' : 'team')
    const targetSenderName = body.sender_name || 'User'
    const targetText = body.message_text || body.text || ''
    const targetImageUrl = body.image_url || (body.media_type === 'image' ? body.media_url : '') || ''
    const targetAudioUrl = body.audio_url || (body.media_type === 'audio' ? body.media_url : '') || ''

    if (!targetRequestId || !targetSenderType) {
      return NextResponse.json({ error: 'Missing required chat fields' }, { status: 400 })
    }

    if (!targetText && !targetImageUrl && !targetAudioUrl) {
      return NextResponse.json({ error: 'Message must contain text, image, or audio' }, { status: 400 })
    }

    const message = await sendChatMessage({
      request_id: targetRequestId,
      sender_type: targetSenderType,
      sender_name: targetSenderName,
      message_text: targetText,
      image_url: targetImageUrl,
      audio_url: targetAudioUrl,
    })

    return NextResponse.json({ success: true, message })
  } catch (error: any) {
    console.error('Send message error:', error)
    return NextResponse.json({ error: error?.message || 'Failed sending message' }, { status: 500 })
  }
}
