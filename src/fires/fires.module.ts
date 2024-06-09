import { Module } from '@nestjs/common';
import { FiresService } from './fires.service';
import { FiresController } from './fires.controller';
import { SequelizeModule } from '@nestjs/sequelize';
import { FirePoint, FirePolygon } from './models';

@Module({
  providers: [FiresService],
  controllers: [FiresController],
  imports: [
    SequelizeModule.forFeature([FirePoint, FirePolygon])
  ],
  exports: [
    FiresService
  ]
})
export class FiresModule {}
