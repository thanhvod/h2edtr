#!/usr/bin/env node
/**
 * Upload default PDF placeholder thumbnails to S3.
 * Run: node scripts/upload-default-thumbnails.mjs
 * Requires: AWS credentials, S3_BUCKET env
 */
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const bucket = process.env.S3_BUCKET
if (!bucket) {
  console.error('S3_BUCKET env required')
  process.exit(1)
}

const region = process.env.AWS_REGION ?? 'ap-southeast-1'
const client = new S3Client({
  region,
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      }
    : undefined,
})

const ASSETS_DIR = join(__dirname, '../assets/default-thumbnails')

async function upload(key, filePath, contentType) {
  const body = await readFile(filePath)
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
  console.log(`Uploaded ${key}`)
}

async function main() {
  await upload(
    'defaults/pdf-placeholder-red.png',
    join(ASSETS_DIR, 'pdf-placeholder-red.png'),
    'image/png',
  )
  await upload(
    'defaults/pdf-placeholder-blue.png',
    join(ASSETS_DIR, 'pdf-placeholder-blue.png'),
    'image/png',
  )
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
