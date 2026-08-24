import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsString()
  @IsUUID()
  userId!: string;

  @IsString()
  refreshToken!: string;

  @IsDate()
  @Type(() => Date)
  expiresAt!: Date;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;
}
