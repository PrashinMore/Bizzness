import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      // Log the error for debugging (remove in production or use proper logger)
      console.error('JWT Auth Error:', {
        error: err?.message,
        infoName: info?.name,
        infoMessage: info?.message,
        hasUser: !!user,
      });

      // Provide more detailed error messages
      if (info?.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired. Please log in again.');
      }
      if (info?.name === 'JsonWebTokenError') {
        // Provide more specific error message
        const errorMsg = info?.message || 'Invalid token';
        if (errorMsg.includes('invalid signature')) {
          throw new UnauthorizedException('Token signature is invalid. This may happen if the server was restarted. Please log in again.');
        }
        if (errorMsg.includes('jwt malformed')) {
          throw new UnauthorizedException('Token format is invalid. Please log in again.');
        }
        throw new UnauthorizedException(`Invalid token: ${errorMsg}. Please log in again.`);
      }
      if (info?.name === 'NotBeforeError') {
        throw new UnauthorizedException('Token not active yet.');
      }
      if (info?.message === 'User not found') {
        throw new UnauthorizedException('User not found. Please log in again.');
      }
      // Generic error for other cases
      throw err || new UnauthorizedException('Authentication failed. Please log in again.');
    }
    return user;
  }
}

