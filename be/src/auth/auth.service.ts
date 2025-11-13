import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { SignupDto } from './dto/signup.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthTokenResponse, SanitizedUser } from '../users/users.types';

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
    return { user, accessToken };
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
    return { user: sanitized, accessToken };
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
    return this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  }
}

