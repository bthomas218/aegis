import { Test, TestingModule } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaService } from './prisma.service';

jest.mock('@prisma/adapter-pg', () => ({
  PrismaPg: jest.fn(),
}));

jest.mock('src/generated/prisma/client', () => {
  class MockPrismaClient {
    public options: unknown;
    public $connect = jest.fn();
    public $disconnect = jest.fn();

    constructor(options: unknown) {
      this.options = options;
    }
  }

  return { PrismaClient: MockPrismaClient };
});

describe('PrismaService', () => {
  let service: PrismaService;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    service = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('creates a PrismaPg adapter using the database url', () => {
    expect(PrismaPg).toHaveBeenCalledWith({
      connectionString: process.env.DATABASE_URL,
    });
  });

  it('connects on module initialization', async () => {
    const connectSpy = jest.spyOn(service, '$connect');
    connectSpy.mockResolvedValue(undefined);

    await service.onModuleInit();

    expect(connectSpy).toHaveBeenCalledTimes(1);
  });

  it('disconnects on module destruction', async () => {
    const disconnectSpy = jest.spyOn(service, '$disconnect');
    disconnectSpy.mockResolvedValue(undefined);

    await service.onModuleDestroy();

    expect(disconnectSpy).toHaveBeenCalledTimes(1);
  });
});
