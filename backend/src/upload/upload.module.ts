import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { IgshareModule } from '../igshare/igshare.module';

@Module({
  imports: [IgshareModule],
  controllers: [UploadController],
})
export class UploadModule {}

