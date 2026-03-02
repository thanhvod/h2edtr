import { IsInt, IsNumber, IsOptional, IsPositive, IsString, Min, MinLength } from 'class-validator'

export class CreatePdfDto {
  @IsString()
  @MinLength(1)
  filename: string

  @IsInt()
  @IsPositive()
  numPages: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  fileSize?: number
}
