import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: PrismaService;
  let jwtService: JwtService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, any> = {
        'jwt.secret': 'test-secret',
        'jwt.refreshSecret': 'test-refresh-secret',
        'jwt.accessTokenExpiresIn': '15m',
        'jwt.refreshTokenExpiresIn': '7d',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue({
        id: 'user-id',
        email: registerDto.email,
        name: registerDto.name,
        role: 'USER',
        createdAt: new Date(),
      });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(registerDto.email);
      expect(result.name).toBe(registerDto.name);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerDto.email },
      });
    });

    it('should throw ConflictException if user already exists', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'password123',
        name: 'Existing User',
      };

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'existing-id',
        email: registerDto.email,
      });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: loginDto.email,
        password: hashedPassword,
        name: 'Test User',
        role: 'USER',
      });

      mockJwtService.signAsync.mockResolvedValue('mock-token');
      mockPrismaService.refreshToken.create.mockResolvedValue({
        token: 'mock-refresh-token',
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe(loginDto.email);
    });

    it('should throw UnauthorizedException with invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('correctpassword', 10);

      mockPrismaService.user.findUnique.mockResolvedValue({
        id: 'user-id',
        email: loginDto.email,
        password: hashedPassword,
        name: 'Test User',
        role: 'USER',
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      mockJwtService.verify.mockReturnValue({
        sub: 'user-id',
        email: 'test@example.com',
        role: 'USER',
      });
      mockJwtService.signAsync.mockResolvedValue('new-token');

      mockPrismaService.refreshToken.findUnique.mockResolvedValue({
        id: 'token-id',
        token: 'old-refresh-token',
        expiresAt: new Date(Date.now() + 86400000),
        isRevoked: false,
        user: {
          id: 'user-id',
          email: 'test@example.com',
          role: 'USER',
        },
      });

      mockPrismaService.refreshToken.update.mockResolvedValue({});
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'new-token-id',
        token: 'new-refresh-token',
      });

      const result = await service.refreshTokens('old-refresh-token');

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('expiresIn');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens('invalid-token')).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserSessions', () => {
    it('should return user sessions', async () => {
      mockPrismaService.refreshToken.findMany.mockResolvedValue([
        {
          id: 'session-1',
          userAgent: 'Mozilla/5.0',
          ipAddress: '127.0.0.1',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
        {
          id: 'session-2',
          userAgent: 'Chrome',
          ipAddress: '192.168.1.1',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      ]);

      const sessions = await service.getUserSessions('user-id');

      expect(sessions).toHaveLength(2);
      expect(sessions[0]).toHaveProperty('id');
      expect(sessions[0]).toHaveProperty('userAgent');
      expect(sessions[0]).toHaveProperty('ipAddress');
      expect(sessions[0].isCurrent).toBe(true);
    });
  });
});
