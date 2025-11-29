import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { type Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import type { AuthTokenResponse, SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  signup(@Body() signupDto: SignupDto): Promise<AuthTokenResponse> {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  login(@Body() loginDto: LoginDto): Promise<AuthTokenResponse> {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthTokenResponse> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reset-password')
  resetPassword(
    @Req() req: RequestWithUser,
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<void> {
    return this.authService.resetPassword(req.user, resetPasswordDto);
  }
}

