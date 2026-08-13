import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'Nanny Tracker backend is running. CI/CD persistence check: 2026-08-13.';
  }
}
