import { Module } from '@nestjs/common';
import { IgshareController } from './igshare.controller';
import { IgshareService } from './igshare.service';

@Module({
  controllers: [IgshareController],
  providers: [IgshareService],
  exports: [IgshareService],
})
export class IgshareModule {}
