import {Inject, Injectable} from '@nestjs/common';

@Injectable()
export class DatabaseService {
  constructor(@Inject('POSTGRES_POOL') private readonly sql: any) {}
  
  async getTable(name: string): Promise<any[]> {
    const client = await this.sql.connect();
    const { rows } = await client.query(`SELECT * FROM ${name}`);
    return rows;
  }
}
