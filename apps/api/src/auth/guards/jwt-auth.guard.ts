import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PASSPORT_STRATEGIES } from '../auth.constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard(PASSPORT_STRATEGIES.JWT) {}
