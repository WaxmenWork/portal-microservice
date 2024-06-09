export class GetFireDatetimesRequest {
    query: {
        startDate: string,
        endDate:string,
        date: string,
        satelliteName: string;
        onlyDates: boolean;
    }
}