export class CreateFirePointDto {

    readonly longitude: number;
    readonly latitude: number;
    readonly temperature: number;
    readonly regionName: string;
    readonly technogenicZone: boolean;
    readonly satelliteName: string;
    readonly datetime: Date;
}