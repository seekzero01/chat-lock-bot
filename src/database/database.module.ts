import { config } from 'dotenv';
import { Module } from '@nestjs/common';
import {DatabaseService} from "./database.service";
import pg from 'pg';

config({
    path: ['.env', '.env.production', '.env.local'],
});

const sql = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const dbProvider = {
    provide: 'POSTGRES_POOL',
    useValue: sql,
};

@Module({
    providers: [dbProvider, DatabaseService],
    exports: [dbProvider, DatabaseService],
})
export class DatabaseModule {}