import { ApiProperty } from '@nestjs/swagger';
import { Column, DataType, Model, Table } from 'sequelize-typescript';

interface FirePolygonCreationAttributes {
    geometry: {type: string, coordinates: any[]};
    length: number;
    area: number;
    regionName: string;
    technogenicZone: boolean;
    satelliteName: string;
    datetime: Date;
}

@Table({ tableName: 'fire_polygons', indexes: [{ unique: true, fields: ['geometry', 'datetime', 'satelliteName'] }], createdAt: false, updatedAt:false })
export class FirePolygon extends Model<FirePolygon, FirePolygonCreationAttributes> {
  @ApiProperty({ example: 1, description: 'Уникальный идентификатор' })
  @Column({
    type: DataType.INTEGER,
    unique: true,
    autoIncrement: true,
    primaryKey: true,
  })
  id: number;

  @ApiProperty({ example: {type: "Polygon", coordinates: [[108.54, 60.16], [108.21, 59.14]]}, description: 'Геометрия полигона' })
  @Column({ type: DataType.GEOMETRY, allowNull: false })
  geometry: {type: string, coordinates: any[]};

  @ApiProperty({ example: 120.0, description: 'Длина распространения' })
  @Column({ type: DataType.DOUBLE, allowNull: false })
  length: number;

  @ApiProperty({ example: 900.0, description: 'Площадь распространения' })
  @Column({ type: DataType.DOUBLE, allowNull: false })
  area: number;

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
