export class GetFireRequest {
    query: {
        startDate: string,
        endDate:string,
        limit: number,
        offset: number,
        satelliteName: string
    }
}