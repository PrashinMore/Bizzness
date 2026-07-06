import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { type Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SanitizedUser } from '../users/users.types';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipesService } from './recipes.service';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  private getFirstOrgId(user: SanitizedUser): string {
    if (!user.organizations || user.organizations.length === 0) {
      throw new ForbiddenException(
        'You must be assigned to at least one organization',
      );
    }
    return user.organizations[0].id;
  }

  @Get('product/:productId')
  async getByProduct(
    @Req() req: RequestWithUser,
    @Param('productId', new ParseUUIDPipe({ version: '4' })) productId: string,
    @Query('outletId') outletId?: string,
  ) {
    const organizationId = this.getFirstOrgId(req.user);
    // Fall back to the header-provided outlet so the mobile client can omit
    // outletId from the query and still get the right (outlet-scoped) recipe.
    const effectiveOutletId =
      outletId || (req.headers['x-outlet-id'] as string) || null;
    return this.recipesService.getByProduct(
      productId,
      organizationId,
      effectiveOutletId,
    );
  }

  @Post()
  async create(@Req() req: RequestWithUser, @Body() dto: CreateRecipeDto) {
    const organizationId = this.getFirstOrgId(req.user);
    return this.recipesService.createRecipe(dto, organizationId);
  }

  @Patch(':id')
  async update(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateRecipeDto,
  ) {
    const organizationId = this.getFirstOrgId(req.user);
    return this.recipesService.updateRecipe(id, dto, organizationId);
  }

  @Delete(':id')
  async remove(
    @Req() req: RequestWithUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    const organizationId = this.getFirstOrgId(req.user);
    await this.recipesService.deleteRecipe(id, organizationId);
    return { success: true };
  }
}
