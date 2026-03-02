import { Type } from 'class-transformer'
import { IsArray, ValidateNested } from 'class-validator'
import { AddPageDto } from './add-page.dto'

export class AddPagesBatchDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddPageDto)
  pages: AddPageDto[]
}
