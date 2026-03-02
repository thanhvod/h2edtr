import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator'
import { Type } from 'class-transformer'

export class PatchStateDto {
  @IsOptional()
  @IsString()
  viewMode?: string

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  zoom?: number

  @IsOptional()
  @IsString()
  tool?: string

  @IsOptional()
  @IsString()
  drawShape?: string

  @IsOptional()
  @IsArray()
  shapes?: unknown[]

  @IsOptional()
  @IsArray()
  pins?: unknown[]

  @IsOptional()
  @IsArray()
  groups?: unknown[]
}
