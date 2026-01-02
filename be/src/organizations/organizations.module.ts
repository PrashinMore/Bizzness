import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Organization } from './entities/organization.entity';
import { OrganizationInvite } from './entities/organization-invite.entity';
import { User } from '../users/entities/user.entity';
import { Outlet } from '../outlets/entities/outlet.entity';
import { OrganizationsService } from './organizations.service';
import { OrganizationsController } from './organizations.controller';
import { InvitesService } from './invites.service';
import { InvitesController } from './invites.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Organization, OrganizationInvite, User, Outlet])],
  controllers: [OrganizationsController, InvitesController],
  providers: [OrganizationsService, InvitesService],
  exports: [TypeOrmModule, OrganizationsService, InvitesService],
})
export class OrganizationsModule {}
