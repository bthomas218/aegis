import { Injectable } from '@nestjs/common';
import { HEALTH_STATUS } from './common/constants/app.constants';

@Injectable()
export class AppService {
  health() {
    return {
      status: HEALTH_STATUS,
    };
  }
}
