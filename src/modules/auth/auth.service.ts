import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { Role, RefreshToken } from '@prisma/client';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  createdAt: Date;
  expiresAt: Date;
  isCurrent: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly emailService: EmailService,
  ) {}

  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async register(registerDto: RegisterDto, userAgent?: string, ipAddress?: string) {
    const { email, password, name } = registerDto;

    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = this.generateVerificationToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: Role.USER,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isEmailVerified: true,
        createdAt: true,
      },
    });

    const frontendUrl =
      this.configService.get<string>('app.frontendUrl') || 'http://localhost:3000';
    const verifyUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    try {
      await this.emailService.sendVerificationEmail({
        to: email,
        name,
        verificationUrl: verifyUrl,
      });
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    return {
      ...user,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  }

  async verifyEmail(token: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    return {
      message: 'Email verified successfully. You can now login.',
    };
  }

  async login(loginDto: LoginDto, userAgent?: string, ipAddress?: string) {
    const { email, password } = loginDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new ForbiddenException(
        'Please verify your email before logging in. Check your inbox for the verification link.',
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role);

    await this.saveRefreshToken(user.id, tokens.refreshToken, userAgent, ipAddress);

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
      },
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  async refreshTokens(refreshToken: string, userAgent?: string, ipAddress?: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const tokenRecord = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
        include: { user: true },
      });

      if (!tokenRecord || tokenRecord.expiresAt < new Date() || tokenRecord.isRevoked) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const newTokens = await this.generateTokens(
        tokenRecord.user.id,
        tokenRecord.user.email,
        tokenRecord.user.role,
      );

      await this.prisma.refreshToken.update({
        where: { id: tokenRecord.id },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
          replacedByToken: newTokens.refreshToken,
        },
      });

      const newTokenRecord = await this.saveRefreshToken(
        tokenRecord.user.id,
        newTokens.refreshToken,
        userAgent,
        ipAddress,
      );

      return {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: this.getAccessTokenExpiryInSeconds(),
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          userId,
          token: refreshToken,
        },
        data: {
          isRevoked: true,
          revokedAt: new Date(),
        },
      });
    } else {
      await this.prisma.refreshToken.deleteMany({
        where: { userId },
      });
    }
  }

  async logoutAllSessions(userId: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { userId },
    });
  }

  async getUserSessions(userId: string): Promise<SessionInfo[]> {
    const tokens = await this.prisma.refreshToken.findMany({
      where: {
        userId,
        isRevoked: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    return tokens.map((token, index) => ({
      id: token.id,
      userAgent: token.userAgent,
      ipAddress: token.ipAddress,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
      isCurrent: index === 0,
    }));
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.refreshToken.findFirst({
      where: {
        id: sessionId,
        userId,
        isRevoked: false,
      },
    });

    if (!session) {
      throw new BadRequestException('Session not found or already revoked');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });

    return { message: 'Session revoked successfully' };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<{ message: string; resetToken?: string }> {
    const { email } = forgotPasswordDto;

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return {
        message: 'If an account exists with this email, a password reset link will be sent',
      };
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.passwordReset.create({
      data: {
        token,
        email,
        expiresAt,
      },
    });

    const resetUrl = `${this.configService.get('app.frontendUrl')}/auth/reset-password?token=${token}`;

    return {
      message: 'If an account exists with this email, a password reset link will be sent',
      resetToken: token,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    const { token, newPassword } = resetPasswordDto;

    const passwordReset = await this.prisma.passwordReset.findUnique({
      where: { token },
    });

    if (!passwordReset) {
      throw new BadRequestException('Invalid reset token');
    }

    if (passwordReset.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    if (passwordReset.usedAt) {
      throw new BadRequestException('Reset token has already been used');
    }

    const user = await this.prisma.user.findUnique({
      where: { email: passwordReset.email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      this.prisma.passwordReset.update({
        where: { id: passwordReset.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    return { message: 'Password has been reset successfully' };
  }

  private async generateTokens(userId: string, email: string, role: string): Promise<TokenPair> {
    const payload: TokenPayload = { sub: userId, email, role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.secret'),
        expiresIn: this.configService.get<string>('jwt.accessTokenExpiresIn') || '15m',
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
        expiresIn: this.configService.get<string>('jwt.refreshTokenExpiresIn') || '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async saveRefreshToken(
    userId: string,
    token: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<RefreshToken> {
    const refreshTokenExpiresIn =
      this.configService.get<string>('jwt.refreshTokenExpiresIn') || '7d';
    const expiresAt = this.calculateExpiryDate(refreshTokenExpiresIn);

    return this.prisma.refreshToken.create({
      data: {
        token,
        userId,
        expiresAt,
        userAgent: userAgent?.substring(0, 500),
        ipAddress: ipAddress,
      },
    });
  }

  private calculateExpiryDate(expiresIn: string): Date {
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }

  private getAccessTokenExpiryInSeconds(): number {
    const expiresIn = this.configService.get<string>('jwt.accessTokenExpiresIn') || '15m';
    const match = expiresIn.match(/^(\d+)([dhms])$/);
    if (!match) return 900;

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1,
      m: 60,
      h: 60 * 60,
      d: 24 * 60 * 60,
    };

    return value * multipliers[unit];
  }
}
