import { Injectable } from '@nestjs/common'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  GetObjectCommandOutput,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Readable } from 'stream'

@Injectable()
export class S3Service {
  private readonly client: S3Client
  private readonly bucket: string

  constructor() {
    const region = process.env.AWS_REGION ?? 'ap-southeast-1'
    this.bucket = process.env.S3_BUCKET ?? ''
    this.client = new S3Client({
      region,
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
          }
        : undefined,
    })
  }

  async upload(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    )
  }

  async getStream(key: string): Promise<Readable> {
    const res: GetObjectCommandOutput = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    )
    if (!res.Body) throw new Error('Empty S3 response')
    return res.Body as Readable
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      )
      return true
    } catch {
      return false
    }
  }

  async getSignedUrl(key: string, expiresIn = 3600): Promise<string> {
    const { GetObjectCommand } = await import('@aws-sdk/client-s3')
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn },
    )
  }

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    )
  }
}
