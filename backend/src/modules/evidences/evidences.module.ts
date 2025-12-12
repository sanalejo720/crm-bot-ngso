import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EvidencesService } from './evidences.service';
import { EvidencesController } from './evidences.controller';
import { Evidence } from './entities/evidence.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Evidence])],
  controllers: [EvidencesController],
  providers: [EvidencesService],
  exports: [EvidencesService],
})
export class EvidencesModule {}
