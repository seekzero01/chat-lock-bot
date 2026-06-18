import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from './database/database.service';

@Controller("/")
export class AppController {
  constructor(private readonly databaseService: DatabaseService) {}

  @Get()
  async getTable() {
    return this.databaseService.getTable('playing_with_neon');
  }
}
