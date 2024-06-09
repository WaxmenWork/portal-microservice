import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule } from '@nestjs/config';
import { FiresModule } from './fires/fires.module';
import { FilesModule } from './files/files.module';
import { FirePoint, FirePolygon } from './fires/models';

@Module({
  controllers: [],
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.${process.env.NODE_ENV}.env`,
    }),
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      models: [FirePoint, FirePolygon],
      autoLoadModels: true,
      pool: {
        max: 75,
        min: 0,
        acquire: 120000,
        idle: 10000,
      },
    }),
    FiresModule,
    FilesModule,
  ],
})
export class AppModule {}
