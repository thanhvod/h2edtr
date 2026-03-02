import { IsInt, IsNumber, IsString, Min } from 'class-validator'

export class AddPageDto {
  @IsInt()
  @Min(1)
  pageNumber: number

  @IsString()
  imageBase64: string

  @IsNumber()
  @Min(1)
  width: number

  @IsNumber()
  @Min(1)
  height: number
}
