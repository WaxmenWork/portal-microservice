export class CreateFirePolygonDto {

    readonly geometry: {type: string, coordinates: any[]};
    readonly length: number;
    readonly area: number;
    readonly regionName: string;
    readonly technogenicZone: boolean;
    readonly satelliteName: string;
    readonly datetime: Date;
}