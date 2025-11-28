import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SanitizedUser } from '../../users/users.types';

export const UserOrganizations = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest();
    const user: SanitizedUser = request.user;
    
    if (!user || !user.organizations) {
      return [];
    }
    
    return user.organizations.map(org => org.id);
  },
);

