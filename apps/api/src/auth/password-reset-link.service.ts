import { Injectable } from '@nestjs/common';

@Injectable()
export class PasswordResetLinkService {
  private readonly sentLinks = new Map<string, string>();

  send(email: string, token: string): Promise<void> {
    this.sentLinks.set(email, token);

    return Promise.resolve();
  }

  getLastToken(email: string) {
    return this.sentLinks.get(email);
  }
}
