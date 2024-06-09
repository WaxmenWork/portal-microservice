import { ApiProperty } from '@nestjs/swagger';

export class FiresResponse {
  @ApiProperty({ description: 'Широта', example: 80.42 })
  latitude: number;

  @ApiProperty({ description: 'Долгота', example: 50.23 })
  longitude: number;

  @ApiProperty({ description: 'Температура', example: 250.2 })
  temperature: number;

  @ApiProperty({ description: 'Название региона', example: 'Республика Бурятия'})
  regionName: string;

  @ApiProperty({ description: 'Название спутника', example: 'NOAA-20'})
  satelliteName: string;

  @ApiProperty({ description: 'Дата фиксации', example: Date.now().toString()})
  datetime: Date;
}
