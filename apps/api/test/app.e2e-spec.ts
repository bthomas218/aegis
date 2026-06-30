import { Controller, INestApplication, Module, Get } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';

@Controller()
class TestAppController {
  @Get()
  getHello() {
    return { status: 'OK' };
  }
}

@Module({
  controllers: [TestAppController],
})
class TestAppModule {}

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [TestAppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({ status: 'OK' });
  });

  afterEach(async () => {
    await app.close();
  });
});
