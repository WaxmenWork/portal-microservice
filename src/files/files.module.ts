import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FiresModule } from 'src/fires/fires.module';

@Module({
  providers: [FilesService],
  imports: [
    FiresModule
  ]
})
export class FilesModule {}
