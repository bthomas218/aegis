import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateResetTokenDTO } from './dto/create-reset-token.dto';

const RESET_TOKEN_EXPIRATION_MINUTES = 15;
@Injectable()
export class ResetTokensService {
  constructor(private readonly prisma: PrismaService) {}

  //TODO: Implement the create method to create a new reset token in the database
  async create(createResetToken: CreateResetTokenDTO) {}

  //TODO: Implement the find method to find a reset token in the database by its token hash
  async find(token: string) {}

  //TODO: Implement the markUsed method to mark a reset token as used in the database
  async markUsed(token: string) {}
}
