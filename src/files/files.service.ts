import { Injectable, OnModuleInit } from '@nestjs/common';
import * as shapefile from 'shapefile';
import * as chokidar from 'chokidar';
import * as path from 'path';
import * as turf from '@turf/turf';
import { FiresService } from 'src/fires/fires.service';
const RBush = require('rbush');


@Injectable()
export class FilesService implements OnModuleInit {

  constructor(private firesService: FiresService) {}

  private region: any;
  private tree: any;
  private torches: any;
  private torchesTree: any;

  async onModuleInit() {

    // Чтение файла с разметкой БПТ
    const geojson = await shapefile.read('/app/src/files/assets/Буферная зона 20 км для пожаров.shp', '/app/src/files/assets/Буферная зона 20 км для пожаров.dbf', {encoding: "utf-8"});
    this.region = geojson.features
      .map(feature => ({geometry: feature.geometry, name: feature.properties.NAME}));

    // Создание R-tree индекса
    this.tree = new RBush();
    this.region.forEach((polygon, i) => {
      const bbox = turf.bbox(polygon.geometry);
      this.tree.insert({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3], i});
    });

    // Создание наблюдателя за файлом факелов
    const torchesWatcher = chokidar.watch(['/app/src/files/assets/fakela_POLIGON.shp'], {
      ignored: /^\./,
      persistent: true,
      usePolling: true,
      interval: 5 * 60 * 1000 // 5 минут
    });

    // Чтение файла факелов
    await this.readTorches('/app/src/files/assets/fakela_POLIGON.shp');

    // Установка события, по которому будет происходить повторное считывание факелов
    torchesWatcher
      .on('change', async (path) => await this.readTorches(path));


    // Создание наблюдателя за файлами ТВВ 
    const firePointsWatcher = chokidar.watch(['/mnt/fires-npp/*.shp', '/mnt/fires-noaa/*.shp'], {
      ignored: /^\./,
      persistent: true,
      usePolling: true,
      interval: 60 * 60 * 1000 // 1 час
    });
  
    // Установка события, по которому будет происходить считывание файлов ТВВ
    firePointsWatcher
      .on('add', async (path) => await this.processShapefile(path))

    // Создание наблюдателя за файлами очагов возгорания
    const firePolygonsWatcher = chokidar.watch([
      '/mnt/fires/2018/**/*.shp',
      '/mnt/fires/2019/**/*.shp', 
      '/mnt/fires/2020/**/*.shp', 
      '/mnt/fires/2021/**/*.shp', 
      '/mnt/fires/2022/**/*.shp', 
      '/mnt/fires/2023/**/*.shp', 
      '/mnt/fires/2024/**/*.shp',  
    ], {
      ignored: /^\./,
      persistent: true,
      usePolling: true,
      interval: 60 * 60 * 1000 // 1 час
    });
  
    // Установкка события, по которому будет происходить считывание файлов очагов возгорания
    firePolygonsWatcher
      .on('add', (path) => this.processShapefile(path))
  
    console.log("Module init!");
  }

  // Функция считывания факелов
  async readTorches(filePath: string) {
    this.torches = [];

    // Открытие файла факелов
    const source = await shapefile.open(filePath);
    let result;

    // Цикл по каждому из факелов
    while (result = await source.read(), !result.done) {
        const feature = result.value;
        // Нахождение центра полигона факела
        const center = turf.centerOfMass(feature.geometry)
        // Проверка, находится ли центр факела внутри БПТ
        const checkPointInRegion = this.isPointInsidePolygons(center, this.region, this.tree);

        // Если находится, то добавляем полигон факела в массив
        if (checkPointInRegion.isInside) {
          this.torches.push({ geometry: feature.geometry });
        }
    }

    // Создаем R-дерево для техногенных зон
    this.torchesTree = new RBush();
    this.torches.forEach((zone, i) => {
        const bbox = turf.bbox(zone.geometry);
        this.torchesTree.insert({ minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3], i });
    });
  }

  // Общая функция обработки shp файлов
  async processShapefile(filePath: string) {
    // Проверка, является ли файл shp файлом
    if (path.extname(filePath) !== '.shp') {
      return;
    }

    // Открываем файл
    const source = await shapefile.open(filePath);

    // Итерация по объектам из файла
    let result;
    while (result = await source.read(), !result.done) {
      const feature = result.value;
      if (!filePath.startsWith('/mnt/fires/')) { // Если в пути файла не /mnt/fires/ то объект это очаг возгорания
        await new Promise(resolve => setTimeout((value) => {this.processFirePoint(feature, filePath); return resolve(value)}, 25));
      } else { // Иначе ТВВ
        await new Promise(resolve => setTimeout((value) => {this.processFirePolygon(feature, filePath); return resolve(value)}, 25));
        
      }
    }
  }

  // Функция обработки ТВВ
  async processFirePoint(feature: any, filePath: string) {
    // Создание точки на основе координат feature
    const point = turf.point([feature.geometry.coordinates[0], feature.geometry.coordinates[1]]);

    // Проверка, находится ли точка внутри БПТ
    const checkPointInRegion = this.isPointInsidePolygons(point, this.region, this.tree);
    if (checkPointInRegion.isInside) {
      // Проверка, находится ли точка внутри факела
      const checkPointInTorch = this.isPointInsidePolygons(point, this.torches, this.torchesTree);
      try {
        // Сохранение ТВВ в БД
        await this.firesService.saveFirePoint({
          longitude: feature.geometry.coordinates[0],
          latitude: feature.geometry.coordinates[1],
          temperature: feature.properties.temperatur ? feature.properties.temperatur : feature.properties.temperature,
          regionName: checkPointInRegion.polygonName,
          technogenicZone: checkPointInTorch.isInside,
          satelliteName: this.getSatelliteFromPath(filePath),
          datetime: this.getDatetimeFromPath(filePath)
        })
        
      } catch (err) {
        if (err.name !== 'SequelizeUniqueConstraintError') {
          console.log(err);
        }
      }
    }
  }

  // Функция обработки очагов возгорания
  async processFirePolygon(feature: any, filePath: string) {
    // Конвертация координат из UTM в WGS84
    const convertedGeometry = this.convertUTMToWGS84(feature.geometry);
    // Нахождение центра полигона
    const center = turf.centerOfMass(convertedGeometry);
    // Проверка, находится ли центр внутри БПТ
    const checkPointInRegion = this.isPointInsidePolygons(center, this.region, this.tree);
    if (checkPointInRegion.isInside) {
      // Проверка, находится ли центр внутри факела
      const checkPointInTorch = this.isPointInsidePolygons(center, this.torches, this.torchesTree);
      try {
        // Сохранение очага возгорания в БД
        await this.firesService.saveFirePolygon({
          geometry: convertedGeometry,
          area: feature.properties.Area && feature.properties.Area !== null ? feature.properties.Area : 0,
          length: feature.properties.Length && feature.properties.Length !== null ? feature.properties.Length : 0,
          regionName: checkPointInRegion.polygonName,
          technogenicZone: checkPointInTorch.isInside,
          satelliteName: this.getSatelliteFromPath(filePath),
          datetime: this.getDatetimeFromPath(filePath)
        })
      } catch (err) {
        if (err.name !== 'SequelizeUniqueConstraintError') {
          console.log(err);
        }
      }
    }
  }

  // Функция проверки точки внутри полигона
  isPointInsidePolygons(point: any, polygons: any, polygonsTree: any): { isInside: boolean, polygonName: string} {
    // Преобразование точки в примитив
    const bbox = turf.bbox(point);
    // Поиск возможных полигонов
    const possiblePolygons = polygonsTree.search({minX: bbox[0], minY: bbox[1], maxX: bbox[2], maxY: bbox[3]}).map(item => polygons[item.i]);
    // Итерация по возможным полигонам
    for (const polygon of possiblePolygons) {
      if (turf.booleanPointInPolygon(point, polygon.geometry)) { // Если точка внутри полигона, возвращаем название полигона и true
        return { isInside: true, polygonName: polygon.name ? polygon.name : "Unknown"}
      }
    }
    return { isInside: false, polygonName: "Unknown" }
  }

  // Функция получения названия спутника из пути к файлу
  getSatelliteFromPath(filePath: string) {
    const satellite = path.basename(path.dirname(filePath));
    const satelliteName = satellite.replace('fires-', '').toLowerCase();
    switch (true) {
      case satelliteName.includes("npp"):
        return "Suomi NPP";
      case satelliteName.includes("noaa"):
        return "NOAA-20";
      case satelliteName.includes("jpss"):
        return "JPSS-1";
      case satelliteName.includes("landsat"):
        return "Landsat-8";
      case satelliteName.includes("sentinel"):
        return "Sentinel-2";
      default:
        return "Unknown";
    }
  }

  // Функция получения даты фиксации из пути к файлу
  getDatetimeFromPath(filePath: string) {
    const filename = path.basename(filePath);
    if (filename[8] !== 'T') {
      const splitedString = filename.split('_')
      const dateString = splitedString[2];
      return new Date(
        parseInt(dateString.substring(0, 4)),
        parseInt(dateString.substring(4, 6)) - 1,
        parseInt(dateString.substring(6, 8)),
        parseInt(splitedString[3]),
        parseInt(splitedString[4]),
        parseInt(splitedString[5])
      );
    } else {
      return new Date(
        parseInt(filename.substring(0, 4)),
        parseInt(filename.substring(4, 6)) - 1,
        parseInt(filename.substring(6, 8)),
        parseInt(filename.substring(9, 11)),
        parseInt(filename.substring(11, 13)),
      )
    }
  }

  // Функция конвертации координат из UTM в WGS84
  convertUTMToWGS84(geometry: any): any {
    // Определение параметров зоны UTM 49N
    const zone = 49;
    const hemisphere = 'N';
    const { type, coordinates } = geometry;

    if (type === 'Point') {
      const [x, y] = coordinates;
      if (x > 180 || y > 180) return geometry;
      return { type, coordinates: this.utmToLatLng(zone, hemisphere, x, y) };
    }

    if (type === 'Polygon') {
      return {
        type,
        coordinates: coordinates.map(ring =>
          ring.map(coord => coord[0] > 180 || coord[1] > 180 ? this.utmToLatLng(zone, hemisphere, coord[0], coord[1]) : [coord[0], coord[1]]))
      }
    }

    if (type === 'MultiPolygon') {
      return {
        type,
        coordinates: coordinates.map(polygon => 
          polygon.map(ring => ring.map(coord => coord[0] > 180 || coord[1] > 180 ? this.utmToLatLng(zone, hemisphere, coord[0], coord[1]) : [coord[0], coord[1]]))
        )
      };
    }

    // Для других типов геометрии необходимо добавить преобразование
    return geometry;
  }

  // Преобразование UTM в широту и долготу
  utmToLatLng(zone: number, hemisphere: string, x: number, y: number): [number, number] {
    const a = 6378137.0; // радиус Земли
    const e = 0.0818191908; // эксцентриситет
    const e1sq = 0.006739497; // e1^2
    const k0 = 0.9996; // коэффициент масштаба

    const arc = y / k0;
    const mu = arc / (a * (1 - Math.pow(e, 2) / 4.0 - 3 * Math.pow(e, 4) / 64.0 - 5 * Math.pow(e, 6) / 256.0));

    const ei = (1 - Math.pow((1 - e * e), (1 / 2.0))) / (1 + Math.pow((1 - e * e), (1 / 2.0)));

    const ca = 3 * ei / 2 - 27 * Math.pow(ei, 3) / 32.0;

    const cb = 21 * Math.pow(ei, 2) / 16 - 55 * Math.pow(ei, 4) / 32;
    const cc = 151 * Math.pow(ei, 3) / 96;
    const cd = 1097 * Math.pow(ei, 4) / 512;
    const phi1 = mu + ca * Math.sin(2 * mu) + cb * Math.sin(4 * mu) + cc * Math.sin(6 * mu) + cd * Math.sin(8 * mu);

    const n0 = a / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (1 / 2.0));
    const r0 = a * (1 - e * e) / Math.pow((1 - Math.pow((e * Math.sin(phi1)), 2)), (3 / 2.0));
    const fact1 = n0 * Math.tan(phi1) / r0;

    const _a1 = 500000 - x;
    const dd0 = _a1 / (n0 * k0);
    const fact2 = dd0 * dd0 / 2;

    const t0 = Math.pow(Math.tan(phi1), 2);
    const Q0 = e1sq * Math.pow(Math.cos(phi1), 2);
    const fact3 = (5 + 3 * t0 + 10 * Q0 - 4 * Math.pow(Q0, 2) - 9 * e1sq) * Math.pow(dd0, 4) / 24;

    const fact4 = (61 + 90 * t0 + 298 * Q0 + 45 * Math.pow(t0, 2) - 252 * e1sq - 3 * Math.pow(Q0, 2)) * Math.pow(dd0, 6) / 720;

    let lof1 = _a1 / (n0 * k0);
    const lof2 = (1 + 2 * t0 + Q0) * Math.pow(dd0, 3) / 6.0;
    const lof3 = (5 - 2 * Q0 + 28 * t0 - 3 * Math.pow(Q0, 2) + 8 * e1sq + 24 * Math.pow(t0, 2)) * Math.pow(dd0, 5) / 120;
    const _a2 = (lof1 - lof2 + lof3) / Math.cos(phi1);
    const _a3 = _a2 * 180 / Math.PI;

    let latitude = 180 * (phi1 - fact1 * (fact2 + fact3 + fact4)) / Math.PI;

    if (hemisphere === 'S') {
      latitude = -latitude;
    }

    const longitude = ((zone > 0) ? (6 * Math.abs(zone) - 183.0) : 3.0) - _a3;

    return [longitude, latitude];
  }
}
