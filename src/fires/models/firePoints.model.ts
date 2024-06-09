import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface FirePointCreationAttributes {
  longitude: number;
  latitude: number;
  temperature: number;
  regionName: string;
  technogenicZone: boolean;
  satelliteName: string;
  datetime: Date;
}

@Table({ tableName: 'fire_points', indexes: [{ unique: true, fields: ['latitude', 'longitude', 'datetime', 'satelliteName'] }], createdAt: false, updatedAt:false })
export class FirePoint extends Model<FirePoint, FirePointCreationAttributes> {
  @ApiProperty({ example: 1, description: 'Уникальный идентификатор' })
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ApiProperty({ example: 40.0, description: 'Долгота' })
  @Column({ type: DataType.DOUBLE, allowNull: false })
  longitude: number;

  @ApiProperty({ example: 50.0, description: 'Широта' })
  @Column({ type: DataType.DOUBLE, allowNull: false })
  latitude: number;

  @ApiProperty({ example: 250.5, description: 'Температура' })
  @Column({ type: DataType.DOUBLE, allowNull: false })
  temperature: number;

  @ApiProperty({ example: 'Республика Бурятия', description: 'Регион'})
  @Column({ type: DataType.STRING, allowNull: false })
  regionName: string;

  @ApiProperty({
    example: true,
    description: 'Принадлежность к техногенным источникам теплового излучения',
  })
  @Column({ type: DataType.BOOLEAN, allowNull: false })
  technogenicZone: boolean;

  @ApiProperty({ example: 'NOAA-20', description: 'Название спутника' })
  @Column({ type: DataType.STRING, allowNull: false })
  satelliteName: string;

  @ApiProperty({
    example: Date.now().toString(),
    description: 'Дата и время съёмки',
  })
  @Column({ type: DataType.DATE, allowNull: false })
  datetime: Date;
}
