import { Test, TestingModule } from '@nestjs/testing';
import { ResetTokensService } from './reset-tokens.service';

describe('ResetTokensService', () => {
  let service: ResetTokensService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ResetTokensService],
    }).compile();

    service = module.get<ResetTokensService>(ResetTokensService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
