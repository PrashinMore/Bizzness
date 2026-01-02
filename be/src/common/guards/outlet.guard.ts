import {
  CanActivate,
  ExecutionContext,
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Outlet } from '../../outlets/entities/outlet.entity';
import type { SanitizedUser } from '../../users/users.types';

type RequestWithUser = Request & {
  user: SanitizedUser;
  outletId?: string;
};

@Injectable()
export class OutletGuard implements CanActivate {
  constructor(
    @InjectRepository(Outlet)
    private readonly outletsRepository: Repository<Outlet>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const outletId = request.headers['x-outlet-id'] as string | undefined;

    if (!outletId) {
      throw new BadRequestException('X-Outlet-Id header is required');
    }

    // Validate outlet exists and belongs to user's organization
    const user = request.user;
    if (!user.organizations || user.organizations.length === 0) {
      throw new ForbiddenException('You must be assigned to at least one organization');
    }

    const organizationIds = user.organizations.map((org) => org.id);
    const outlet = await this.outletsRepository.findOne({
      where: { id: outletId },
    });

    if (!outlet) {
      throw new ForbiddenException('Outlet not found');
    }

    if (!organizationIds.includes(outlet.organizationId)) {
      throw new ForbiddenException('You do not have access to this outlet');
    }

    if (!outlet.isActive) {
      throw new ForbiddenException('Outlet is not active');
    }

    // Attach outlet ID to request for use in controllers/services
    request.outletId = outletId;

    return true;
  }
}

