import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutletsController } from './outlets.controller';
import { OutletsService } from './outlets.service';
import { Outlet } from './entities/outlet.entity';
import { OutletGuard } from '../common/guards/outlet.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Outlet])],
  controllers: [OutletsController],
  providers: [OutletsService, OutletGuard],
  exports: [OutletsService, OutletGuard],
})
export class OutletsModule {}

