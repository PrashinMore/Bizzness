import {
  ForbiddenException,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { UsersService } from '../../users/users.service';
import { JWT_CONFIG } from '../../auth/jwt.config';

/**
 * Global gate (wired in AppModule): authenticated users without an organization
 * cannot hit most API routes until they create or join one.
 *
 * Orientation for contributors:
 * - OPTIONS and an allow-list of auth/bootstrap paths skip the check.
 * - Missing/invalid tokens do not hard-fail here (route guards still apply);
 *   the middleware only enforces the "has an org" rule once identity is known.
 * - When adding public endpoints, update `isAllowedWithoutOrganization`.
 */
@Injectable()
export class OrganizationRequiredMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (req.method === 'OPTIONS') {
      next();
      return;
    }

    const path = this.normalizePath(req.originalUrl);
    if (this.isAllowedWithoutOrganization(req.method, path)) {
      next();
      return;
    }

    const token = this.extractBearerToken(req.headers.authorization);
    if (!token) {
      next();
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ sub: string }>(token, {
        secret: JWT_CONFIG.secret,
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        next();
        return;
      }

      if (!user.organizations || user.organizations.length === 0) {
        throw new ForbiddenException(
          'You must create or join an organization before accessing this resource',
        );
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }
      // Invalid/expired token — let route guards handle auth failures.
      next();
      return;
    }

    next();
  }

  private normalizePath(url: string): string {
    const withoutQuery = url.split('?')[0] ?? url;
    return withoutQuery.replace(/^\/api/, '') || '/';
  }

  private extractBearerToken(authorization?: string): string | null {
    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }
    return authorization.slice('Bearer '.length).trim() || null;
  }

  private isAllowedWithoutOrganization(method: string, path: string): boolean {
    const authPaths = ['/auth/signup', '/auth/login', '/auth/refresh'];
    if (authPaths.includes(path) && method === 'POST') {
      return true;
    }

    if (path === '/users/me' && (method === 'GET' || method === 'DELETE')) {
      return true;
    }

    if (path === '/organizations' && (method === 'GET' || method === 'POST')) {
      return true;
    }

    if (path === '/invites/my' && method === 'GET') {
      return true;
    }

    if (path === '/invites/token/respond' && method === 'POST') {
      return true;
    }

    if (method === 'POST' && /^\/invites\/[^/]+\/respond$/.test(path)) {
      return true;
    }

    return false;
  }
}
