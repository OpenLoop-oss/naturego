import {
  Controller,
  Post,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Get,
  Delete,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiCookieAuth } from '@nestjs/swagger';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthService, SessionInfo } from './auth.service';
import { RegisterDto, LoginDto, ForgotPasswordDto, ResetPasswordDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { ConfigService } from '@nestjs/config';

@ApiTags('Auth')
@Controller('auth')
@SkipThrottle()
export class AuthController {
  private readonly accessTokenCookieName = 'accessToken';
  private readonly refreshTokenCookieName = 'refreshToken';

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ short: { limit: 5, ttl: 60000 }, long: { limit: 10, ttl: 3600000 } })
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto, @Req() req: Request) {
    const user = await this.authService.register(registerDto, req.headers['user-agent'], req.ip);
    return {
      success: true,
      message: user.message,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        isEmailVerified: user.isEmailVerified,
      },
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Body('token') token: string) {
    const result = await this.authService.verifyEmail(token);
    return {
      success: true,
      message: result.message,
    };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ short: { limit: 3, ttl: 60000 }, long: { limit: 5, ttl: 3600000 } })
  @ApiOperation({ summary: 'Request password reset link' })
  @ApiResponse({ status: 200, description: 'Password reset link sent if email exists' })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const result = await this.authService.forgotPassword(forgotPasswordDto);
    return {
      success: true,
      message: result.message,
      ...(process.env.NODE_ENV !== 'production' && { resetToken: result.resetToken }),
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiResponse({ status: 200, description: 'Password reset successful' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return {
      success: true,
      ...result,
    };
  }

  @Post('login')
  @Throttle({ short: { limit: 5, ttl: 60000 }, long: { limit: 20, ttl: 3600000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto, req.headers['user-agent'], req.ip);

    this.setTokenCookies(res, result.accessToken, result.refreshToken || '');

    return {
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid refresh token' })
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      return res.status(HttpStatus.UNAUTHORIZED).json({
        success: false,
        message: 'Refresh token not found',
      });
    }

    const tokens = await this.authService.refreshTokens(
      refreshToken,
      req.headers['user-agent'],
      req.ip,
    );

    this.setTokenCookies(res, tokens.accessToken, tokens.refreshToken);

    return {
      success: true,
      message: 'Token refreshed successfully',
      data: {
        expiresIn: tokens.expiresIn,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    const user = req.user as { id: string } | undefined;

    if (user?.id) {
      await this.authService.logout(user.id, refreshToken);
    }

    this.clearTokenCookies(res);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get user sessions' })
  @ApiResponse({ status: 200, description: 'Sessions retrieved' })
  async getSessions(@Req() req: Request) {
    const user = req.user as { id: string };
    const sessions = await this.authService.getUserSessions(user.id);
    return {
      success: true,
      data: { sessions },
    };
  }

  @Delete('sessions')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Logout from all sessions' })
  @ApiResponse({ status: 200, description: 'All sessions terminated' })
  async logoutAllSessions(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const user = req.user as { id: string };
    await this.authService.logoutAllSessions(user.id);
    this.clearTokenCookies(res);

    return {
      success: true,
      message: 'All sessions terminated',
    };
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Revoke specific session' })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  @ApiResponse({ status: 400, description: 'Session not found' })
  async revokeSession(@Req() req: Request, @Param('sessionId') sessionId: string) {
    const user = req.user as { id: string };
    const result = await this.authService.revokeSession(user.id, sessionId);
    return {
      success: true,
      ...result,
    };
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    const nodeEnv = this.configService.get<string>('nodeEnv') || 'development';
    const isProduction = nodeEnv === 'production';

    res.cookie(this.accessTokenCookieName, accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite:
        (this.configService.get<string>('cookie.sameSite') as 'lax' | 'strict' | 'none') || 'lax',
      domain: isProduction ? this.configService.get<string>('cookie.domain') : undefined,
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.cookie(this.refreshTokenCookieName, refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite:
        (this.configService.get<string>('cookie.sameSite') as 'lax' | 'strict' | 'none') || 'lax',
      domain: isProduction ? this.configService.get<string>('cookie.domain') : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }

  private clearTokenCookies(res: Response) {
    const nodeEnv = this.configService.get<string>('nodeEnv') || 'development';
    const isProduction = nodeEnv === 'production';

    res.cookie(this.accessTokenCookieName, '', {
      httpOnly: true,
      secure: isProduction,
      sameSite:
        (this.configService.get<string>('cookie.sameSite') as 'lax' | 'strict' | 'none') || 'lax',
      domain: isProduction ? this.configService.get<string>('cookie.domain') : undefined,
      expires: new Date(0),
      path: '/',
    });

    res.cookie(this.refreshTokenCookieName, '', {
      httpOnly: true,
      secure: isProduction,
      sameSite:
        (this.configService.get<string>('cookie.sameSite') as 'lax' | 'strict' | 'none') || 'lax',
      domain: isProduction ? this.configService.get<string>('cookie.domain') : undefined,
      expires: new Date(0),
      path: '/',
    });
  }
}
