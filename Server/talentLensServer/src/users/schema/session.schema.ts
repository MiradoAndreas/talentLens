import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SessionDocument = HydratedDocument<Session>;

@Schema({
  timestamps: true,
})
export class Session {
  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  refreshTokenHash!: string;

  @Prop({
    required: true,
  })
  expiresAt!: Date;

  @Prop({
    required: false,
  })
  ipAddress?: string;

  @Prop({
    required: false,
  })
  userAgent?: string;

  @Prop({
    required: false,
  })
  lastUsedAt?: Date;

  @Prop({
    required: false,
  })
  revokedAt?: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
