import { IsString } from 'class-validator'

export class AddThumbnailDto {
  @IsString()
  thumbnailBase64: string
}
