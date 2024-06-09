import { ApiProperty } from '@nestjs/swagger';

export class FireDatetimesResponse {
    
    @ApiProperty({ description: 'Дата фиксации', example: Date.now().toString()})
    datetime: Date;
}
