// lib/cloudflareStorage.ts
import fs from 'fs/promises'
import path from 'path'
import crypto from 'crypto'

export interface UploadResult {
  url: string
  key: string
  storageType: 'cloudflare_r2' | 'local_fallback'
}

/**
 * Uploads a file (Buffer) to Cloudflare R2 storage if credentials are configured,
 * otherwise gracefully falls back to local storage in public/uploads.
 */
export async function uploadToCloudflareStorage(
  fileBuffer: Buffer,
  fileName: string,
  contentType: string
): Promise<UploadResult> {
  const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME
  const publicUrl = process.env.CLOUDFLARE_R2_PUBLIC_URL?.replace(/\/$/, '')

  const ext = path.extname(fileName) || (contentType.includes('audio') ? '.webm' : '.jpg')
  const uniqueKey = `uploads/${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`

  // 1. If Cloudflare R2 credentials are provided, use R2 via S3 client
  if (accountId && accessKeyId && secretAccessKey && bucketName) {
    try {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
      const s3 = new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })

      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: uniqueKey,
          Body: fileBuffer,
          ContentType: contentType,
        })
      )

      const finalUrl = publicUrl ? `${publicUrl}/${uniqueKey}` : `https://${bucketName}.r2.dev/${uniqueKey}`
      return {
        url: finalUrl,
        key: uniqueKey,
        storageType: 'cloudflare_r2',
      }
    } catch (r2Error) {
      console.warn('Cloudflare R2 upload failed, falling back to local storage:', r2Error)
    }
  }

  // 2. Fallback to local storage in public/uploads/
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
  await fs.mkdir(uploadsDir, { recursive: true })

  const localFileName = path.basename(uniqueKey)
  const localFilePath = path.join(uploadsDir, localFileName)
  await fs.writeFile(localFilePath, fileBuffer)

  return {
    url: `/uploads/${localFileName}`,
    key: uniqueKey,
    storageType: 'local_fallback',
  }
}
