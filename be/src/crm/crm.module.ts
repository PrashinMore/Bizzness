import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrmController } from './crm.controller';
import { CrmService } from './crm.service';
import { Customer } from './entities/customer.entity';
import { CustomerVisit } from './entities/customer-visit.entity';
import { CustomerNote } from './entities/customer-note.entity';
import { CustomerFeedback } from './entities/customer-feedback.entity';
import { LoyaltyAccount } from './entities/loyalty-account.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { Reward } from './entities/reward.entity';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer,
      CustomerVisit,
      CustomerNote,
      CustomerFeedback,
      LoyaltyAccount,
      LoyaltyTransaction,
      Reward,
    ]),
    forwardRef(() => SettingsModule),
  ],
  controllers: [CrmController],
  providers: [CrmService],
  exports: [CrmService],
})
export class CrmModule {}

