import { Controller} from '@nestjs/common';
import { FiresService } from './fires.service';
import { MessagePattern } from '@nestjs/microservices';
import { GetFireDatetimesRequest, GetFireRequest } from './requests';

@Controller()
export class FiresController {
  constructor(private firesService: FiresService) {}

  @MessagePattern({ cmd: "getFirePointsByDate" })
  getFirePointsByDate(req: GetFireRequest) {
    return this.firesService.getFires(req.query.startDate, req.query.endDate, req.query.limit, req.query.offset, req.query.satelliteName);
  }

  @MessagePattern({ cmd: "getFirePointDatetimes" })
  getFirePointDatetimes(req: GetFireDatetimesRequest) {
    return this.firesService.getFireTimes(req.query.startDate, req.query.endDate, req.query.satelliteName, false, req.query.onlyDates);
  }

  @MessagePattern({ cmd: "getFirePolygonsByDate"})
  getFirePolygonsByDate(req: GetFireRequest) {
    return this.firesService.getFires(req.query.startDate, req.query.endDate, req.query.limit, req.query.offset, req.query.satelliteName, true);
  }

  @MessagePattern({ cmd: "getFirePolygonDatetimes" })
  getFirePolygonDatetimes(req: GetFireDatetimesRequest) {
    return this.firesService.getFireTimes(req.query.startDate, req.query.endDate, req.query.satelliteName, true, req.query.onlyDates);
  }
}
