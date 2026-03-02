import { IsString } from 'class-validator'

export class AddCapturedDto {
  @IsString()
  imageBase64: string
}
