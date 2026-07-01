import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordResetLinkService {
  private readonly sentLinks = new Map<string, string>();

  async send(email: string, token: string) {
    this.sentLinks.set(email, token);
  }

  getLastToken(email: string) {
    return this.sentLinks.get(email);
  }
}
