import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthTokenResponse, SanitizedUser } from '../users/users.types';
import { JWT_CONFIG } from './jwt.config';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto): Promise<AuthTokenResponse> {
    const user = await this.usersService.create(
      {
        name: signupDto.name,
        email: signupDto.email,
        password: signupDto.password,
      },
      { allowAdminRole: false },
    );

    const accessToken = await this.generateToken(user);
    const refreshToken = await this.generateAndSaveRefreshToken(user.id);
    return { user, accessToken, refreshToken };
  }

  async login(loginDto: LoginDto): Promise<AuthTokenResponse> {
    const userEntity = await this.usersService.validateCredentials(
      loginDto.email,
      loginDto.password,
    );

    if (!userEntity) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const sanitized = await this.usersService.findById(userEntity.id);
    if (!sanitized) {
      throw new UnauthorizedException('User no longer exists');
    }

    const accessToken = await this.generateToken(sanitized);
    const refreshToken = await this.generateAndSaveRefreshToken(sanitized.id);
    return { user: sanitized, accessToken, refreshToken };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenResponse> {
    const userEntity = await this.usersService.findByRefreshToken(refreshToken);
    
    if (!userEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if refresh token is expired
    if (userEntity.refreshTokenExpiresAt && userEntity.refreshTokenExpiresAt < new Date()) {
      // Clear expired token
      await this.usersService.clearRefreshToken(userEntity.id);
      throw new UnauthorizedException('Refresh token expired');
    }

    const sanitized = await this.usersService.findById(userEntity.id);
    if (!sanitized) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Generate new tokens
    const accessToken = await this.generateToken(sanitized);
    const newRefreshToken = await this.generateAndSaveRefreshToken(sanitized.id);
    
    return { user: sanitized, accessToken, refreshToken: newRefreshToken };
  }

  async resetPassword(
    requester: SanitizedUser,
    dto: ResetPasswordDto,
  ): Promise<void> {
    const targetUserId = dto.userId ?? requester.id;
    const targetUserEntity = await this.usersService.findEntityById(
      targetUserId,
    );

    if (!targetUserEntity) {
      throw new BadRequestException('User not found');
    }

    const isSelf = targetUserEntity.id === requester.id;

    if (!isSelf && requester.role !== 'admin') {
      throw new ForbiddenException(
        'Only admins can reset passwords for other users',
      );
    }

    if (isSelf) {
      if (!dto.currentPassword) {
        throw new BadRequestException('Current password is required');
      }

      const isValid = await compare(
        dto.currentPassword,
        targetUserEntity.passwordHash,
      );
      if (!isValid) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    await this.usersService.update(
      targetUserEntity.id,
      { password: dto.newPassword },
      { allowRoleChange: requester.role === 'admin' },
    );
  }

  private async generateToken(user: SanitizedUser): Promise<string> {
    return this.jwtService.signAsync(
      {
        sub: user.id,
        email: user.email,
        role: user.role,
      },
      {
        expiresIn: JWT_CONFIG.expiresIn,
      },
    );
  }

  private async generateAndSaveRefreshToken(userId: string): Promise<string> {
    // Generate a secure random token
    const token = randomBytes(64).toString('hex');
    
    // Calculate expiration date (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    
    // Save to database
    await this.usersService.saveRefreshToken(userId, token, expiresAt);
    
    return token;
  }
}

