import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { FirePoint, FirePolygon } from './models';
import { CreateFirePointDto, CreateFirePolygonDto } from './dto';
import { Op, Sequelize } from 'sequelize';
import { RpcException } from '@nestjs/microservices';

@Injectable()
export class FiresService {

  constructor(
    @InjectModel(FirePoint) private firePointRepository: typeof FirePoint,
    @InjectModel(FirePolygon) private firePolygonRepository: typeof FirePolygon
    )
  {}

  // Получить ТВВ или очаги возгорания из БД
  async getFires(start: string, end?: string | null, limit: number = 50, offset: number = 0, satelliteName: string = "all", isPolygon: boolean = false) {
    if (!start && !end) {
      return await this.firePointRepository.findAll({limit, offset}); // Если начальная и конечная дата выдачи не указана, возвращается первые 50 найденных объектов
    }
    // Отделение временной зоны от даты и времени
    let [startDatetime, startTimezone] = this.splitDatetimeAndTimezone(start);
    let [endDatetime, endTimezone] = this.splitDatetimeAndTimezone(end);
    
    if (isNaN(Date.parse(startDatetime)))
      throw new RpcException({message: "Неверный формат даты", status: HttpStatus.BAD_REQUEST});

    // Преобразование дат в формат, удобный для поиска в БД
    const startDate = new Date(Date.parse(startDatetime));
    const endDate = endDatetime && !isNaN(Date.parse(endDatetime))
                    ? new Date(Date.parse(endDatetime))
                    : new Date(Date.parse(startDatetime)).setHours(startDate.getHours(), startDate.getMinutes() + 1, startDate.getSeconds() + 1, startDate.getMilliseconds() + 100);

    if ((endDatetime && !isNaN(Date.parse(endDatetime))) && endTimezone !== startTimezone) // Если временные зоны у указанного интервала различаются
      throw new RpcException({message: "Несовместимость временных зон", status: HttpStatus.BAD_REQUEST});

    // Выбор сущности для сохранения
    let repository: any = isPolygon ? this.firePolygonRepository : this.firePointRepository;
    // Параметры поиска по датам
    let whereClause: { [key: string]: any } = {
      datetime: {
        [Op.between]: [startDate, endDate]
      }
    };
    // Если указано название спутника, добавляется поиск по названию спутнника
    if (satelliteName.toLowerCase() !== 'all') {
      whereClause.satelliteName = {
        [Op.iLike]: `%${satelliteName}%`
      };
    }
    // Поиск в БД с параметрами
    let result = await repository.findAll({
      where: whereClause,
      order: [['datetime', 'ASC']]
    });
    // Фильтрация результата
    return result.map((item: any) => {return {...item.dataValues, datetime: (item.get('datetime') as Date).toISOString().replace('Z', startTimezone)}});
  }

  // Получить даты и время сохранённых ТВВ и очагов возгорания
  async getFireTimes(start: string, end?: string | null, satelliteName: string = "all", isPolygon: boolean = false, onlyDates: boolean = false) {
    if (!start) return []; // Если не указана начальная дата, возвращается пустой массив
    // Отделение временной зоны от даты и времени
    let [startDatetime, startTimezone] = this.splitDatetimeAndTimezone(start);
    let [endDatetime, endTimezone] = this.splitDatetimeAndTimezone(end);

    if (isNaN(Date.parse(startDatetime)))
      throw new RpcException({message: "Неверный формат даты", status: HttpStatus.BAD_REQUEST});
    // Преобразование дат в формат, удобный для поиска в БД
    const startDate = new Date(Date.parse(startDatetime));
    const endDate = endDatetime && !isNaN(Date.parse(endDatetime))
                    ? new Date(Date.parse(endDatetime))
                    : new Date(Date.parse(startDatetime)).setHours(23, 59, 59, 999);

    if ((endDatetime && !isNaN(Date.parse(endDatetime))) && endTimezone !== startTimezone) // Если временные зоны у указанного интервала различаются
      throw new RpcException({message: "Несовместимость временных зон", status: HttpStatus.BAD_REQUEST});
    
    // Выбор сущности для сохранения
    let repository: any = isPolygon ? this.firePolygonRepository : this.firePointRepository;
    // Параметры поиска по датам
    let whereClause: { [key: string]: any } = {
      datetime: {
        [Op.between]: [startDate, endDate]
      }
    };
    // Если указано название спутника, добавляется поиск по названию спутнника
    if (satelliteName.toLowerCase() !== 'all') {
      whereClause.satelliteName = {
        [Op.iLike]: `%${satelliteName}%`
      };
    }
    // Поиск в БД с параметрами
    let result = await repository.findAll({
      where: whereClause,
      order: [['datetime', 'ASC']],
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('datetime')), 'datetime']]
    });
    // Преобразовать результат в массив уникальных дат
    const uniqueDates = !onlyDates
                         ? result.map((item: any) => (item.get('datetime') as Date).toISOString().replace('Z', startTimezone))
                         : result.map((item: any) => (item.get('datetime') as Date).toISOString().split('T')[0]) ;
    return !onlyDates ? uniqueDates : uniqueDates.filter((value, i, self) => i === self.indexOf(value));
  }

  // Сохранить ТВВ
  async saveFirePoint(fireDto: CreateFirePointDto) {
    return await this.firePointRepository.create(fireDto, {logging: false});
  }

  // Сохранить очаг возгорания
  async saveFirePolygon(fireDto: CreateFirePolygonDto) {
    return await this.firePolygonRepository.create(fireDto, {logging: false});
  }

  // Отделить дату и время от временной зоны
  private splitDatetimeAndTimezone(date: string) {
    if (!date) return [null, null]

    const datetimeWithTimezone = date.split(' ');
    let datetime = datetimeWithTimezone[0];
    let timezone = "+07:00";

    if (datetimeWithTimezone.length > 1) {
      datetime += "Z";
      timezone = "+" + datetimeWithTimezone[1];
    } else if (date.split('-').length > 3) {
      let temp = date.split('-');
      datetime = `${temp[0]}-${temp[1]}-${temp[2]}Z`;
      timezone = "-" + temp[3];
    }

    return [datetime, timezone];
  }
}
