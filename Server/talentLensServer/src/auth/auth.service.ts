import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import * as bcrypt from 'bcrypt';
import { UserDocument } from '../users/schema/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { randomBytes } from 'crypto';
import { SessionService } from './session.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sessionService: SessionService,
  ) {}

  async register(registerDto: RegisterDto) {
    const { email, name, password } = registerDto;
    const existingUser = await this.userService.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await this.userService.create(name, email, hashedPassword);

    return this.generateToken(user);
  }

  async generateToken(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      access_token: accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const { email, password } = loginDto;
    const user = await this.userService.findByEmail(email);
    console.log('User find : ', user);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(password, user.password);

    if (!passwordValid) {
      console.log('Password not valid');
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createAuthentificationSession(user, ipAddress, userAgent);
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private async createAuthentificationSession(
    user: UserDocument,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const accessToken = await this.generateAccessToken(user);

    const refreshToken = this.generateRefreshToken();

    const expiresAt = this.getRefreshTokenExpiration();

    const createSessionDto = {
      userId: user._id.toString(),
      refreshToken,
      expiresAt,
      ipAddress,
      userAgent,
    };

    const session = await this.sessionService.create(createSessionDto);

    return {
      access_token: accessToken,

      refresh_token: refreshToken,

      session_id: session._id,

      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  private async generateAccessToken(user: UserDocument) {
    const payload = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    };

    return this.jwtService.signAsync(payload);
  }

  private getRefreshTokenExpiration(): Date {
    const days =
      Number(this.configService.get<string>('JWT_REFRESH_EXPIRATION_DAYS')) ||
      7;

    const expiresAt = new Date();

    expiresAt.setDate(expiresAt.getDate() + days);

    return expiresAt;
  }

  async refresh(refreshToken: string, sessionId: string) {
    const session = await this.sessionService.findById(sessionId);

    if (!session) {
      throw new UnauthorizedException('Invalid session');
    }

    await this.sessionService.verifyRefreshToken(session, refreshToken);

    const user = await this.userService.findBydId(session.userId.toString());

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }
    const newAccessToken = await this.generateAccessToken(user);

    const newRefreshToken = this.generateRefreshToken();

    const newExpiresAt = this.getRefreshTokenExpiration();

    await this.sessionService.rotate(session, newRefreshToken, newExpiresAt);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      session_id: session._id,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async logout(sessionId: string, userId: string) {
    await this.sessionService.revokeUserSession(sessionId, userId);

    return {
      message: 'Logged out successfully',
    };
  }

  async logoutAll(userId: string) {
    await this.sessionService.revokeAllForUser(userId);

    return {
      message: 'All sessions have been revoked',
    };
  }

  async getSessions(userId: string) {
    return this.sessionService.findUserSessions(userId);
  }

  async revokeSession(sessionId: string, userId: string) {
    await this.sessionService.revokeUserSession(sessionId, userId);

    return {
      message: 'Session revoked successfully',
    };
  }
}
