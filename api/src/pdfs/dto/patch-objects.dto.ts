import { IsArray, IsOptional } from 'class-validator'

export class PatchObjectsDto {
  @IsOptional()
  @IsArray()
  shapes?: Array<{
    id?: string
    type: string
    x: number
    y: number
    width?: number
    height?: number
    radius?: number
    color?: string
    borderWidth?: number
  }>

  @IsOptional()
  @IsArray()
  pins?: Array<{ id?: string; x: number; y: number }>

  @IsOptional()
  @IsArray()
  groups?: Array<{
    id?: string
    pinId: string
    pinX: number
    pinY: number
    shapeIds: string[]
    shapes: Record<
      string,
      {
        type: string
        localX: number
        localY: number
        width?: number
        height?: number
        radius?: number
        color?: string
        borderWidth?: number
      }
    >
  }>
}
