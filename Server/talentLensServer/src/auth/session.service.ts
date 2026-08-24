import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateSessionDto } from './dto/createSession.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Session, SessionDocument } from '../users/schema/session.schema';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SessionService {
  constructor(
    @InjectModel(Session.name)
    private readonly sessionModel: Model<SessionDocument>,
  ) {}

  async create(createSessionDto: CreateSessionDto) {
    const { userId, refreshToken, expiresAt, ipAddress, userAgent } =
      createSessionDto;
    const refreshTokenHash = await bcrypt.hash(refreshToken, 12);

    return this.sessionModel.create({
      userId: new Types.ObjectId(userId),
      refreshTokenHash,
      expiresAt,
      lastUsedAt: new Date(),
      ipAddress,
      userAgent,
    });
  }

  async findById(sessionId: string) {
    return this.sessionModel.findById(sessionId);
  }

  async verifyRefreshToken(session: SessionDocument, refreshToken: string) {
    if (session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const valid = await bcrypt.compare(refreshToken, session.refreshTokenHash);

    if (!valid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return true;
  }

  async rotate(
    session: SessionDocument,
    newRefreshToken: string,
    expiresAt: Date,
  ) {
    const refreshTokenHash = await bcrypt.hash(newRefreshToken, 12);

    session.refreshTokenHash = refreshTokenHash;

    session.expiresAt = expiresAt;

    session.lastUsedAt = new Date();

    await session.save();

    return session;
  }

  // todo: remove it to confirm the revokeUserSession is the right one
  async revoke(sessionId: string) {
    return this.sessionModel.findByIdAndUpdate(
      sessionId,
      {
        revokedAt: new Date(),
      },
      {
        new: true,
      },
    );
  }

  async revokeAllForUser(userId: string) {
    return this.sessionModel.updateMany(
      {
        userId: new Types.ObjectId(userId),
        revokedAt: null,
      },
      {
        revokedAt: new Date(),
      },
    );
  }

  async findUserSessions(userId: string) {
    return this.sessionModel
      .find({
        userId: new Types.ObjectId(userId),
        revokedAt: null,
        expiresAt: {
          $gt: new Date(),
        },
      })
      .select('-refreshTokenHash')
      .sort({
        createdAt: -1,
      });
  }

  async revokeUserSession(sessionId: string, userId: string) {
    const session = await this.sessionModel.findOne({
      _id: sessionId,
      userId: new Types.ObjectId(userId),
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    session.revokedAt = new Date();

    await session.save();

    return {
      message: 'Session revoked successfully',
    };
  }
}
