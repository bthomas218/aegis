import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PASSPORT_STRATEGIES } from '../auth.constants';

@Injectable()
export class LocalAuthGuard extends AuthGuard(PASSPORT_STRATEGIES.LOCAL) {}
