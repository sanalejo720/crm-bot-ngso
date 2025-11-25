import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtorsService } from './debtors.service';
import { DebtorsController } from './debtors.controller';
import { Debtor } from './entities/debtor.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Debtor])],
  controllers: [DebtorsController],
  providers: [DebtorsService],
  exports: [DebtorsService],
})
export class DebtorsModule {}
