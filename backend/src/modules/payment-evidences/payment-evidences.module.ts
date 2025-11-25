import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentEvidencesController } from './payment-evidences.controller';
import { PaymentEvidencesService } from './payment-evidences.service';
import { PaymentEvidence } from './entities/payment-evidence.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PaymentEvidence])],
  controllers: [PaymentEvidencesController],
  providers: [PaymentEvidencesService],
  exports: [PaymentEvidencesService],
})
export class PaymentEvidencesModule {}
