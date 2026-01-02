import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { type Request } from 'express';
import { StockService } from './stock.service';
import { AdjustStockDto } from '../products/dto/adjust-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { SanitizedUser } from '../users/users.types';

type RequestWithUser = Request & { user: SanitizedUser };

@UseGuards(JwtAuthGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  private getOutletId(req: RequestWithUser): string {
    const outletId = (req.headers['x-outlet-id'] as string) || null;
    if (!outletId) {
      throw new ForbiddenException('Outlet ID is required. Please select an outlet.');
    }
    return outletId;
  }

  @Get('outlet/:outletId')
  async getStockForOutlet(
    @Req() req: RequestWithUser,
    @Param('outletId') outletId: string,
    @Query('productIds') productIds?: string,
  ) {
    const productIdArray = productIds ? productIds.split(',') : undefined;
    return this.stockService.getStockForOutlet(outletId, productIdArray);
  }

  @Get('product/:productId')
  async getStockForProduct(@Req() req: RequestWithUser, @Param('productId') productId: string) {
    const outletId = this.getOutletId(req);
    return this.stockService.getStock(productId, outletId);
  }

  @Get('low-stock')
  async getLowStockItems(
    @Req() req: RequestWithUser,
    @Query('outletId') outletId?: string,
  ) {
    const selectedOutletId = outletId || this.getOutletId(req);
    
    if (!req.user.organizations || req.user.organizations.length === 0) {
      throw new ForbiddenException('You must be assigned to at least one organization');
    }
    const organizationId = req.user.organizations[0].id;

    return this.stockService.getLowStockItems(selectedOutletId, organizationId);
  }

  @Patch('product/:productId/adjust')
  async adjustStock(
    @Req() req: RequestWithUser,
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
  ) {
    const outletId = this.getOutletId(req);
    return this.stockService.adjustStock(productId, outletId, dto.delta);
  }

  @Patch('product/:productId/set')
  async setStock(
    @Req() req: RequestWithUser,
    @Param('productId') productId: string,
    @Body() body: { quantity: number },
  ) {
    const outletId = this.getOutletId(req);
    return this.stockService.setStock(productId, outletId, body.quantity);
  }
}

