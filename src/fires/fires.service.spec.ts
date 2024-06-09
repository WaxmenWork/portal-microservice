import { Test, TestingModule } from '@nestjs/testing';
import { FiresService } from './fires.service';

describe('FiresService', () => {
  let service: FiresService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FiresService],
    }).compile();

    service = module.get<FiresService>(FiresService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
