import {createHash} from 'crypto';
import {mkdirSync} from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';

export type StoredBattle = {
    id: string
    battle: unknown
}

const canonicalize = (value: unknown): string => {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(canonicalize).join(',')}]`;
    }

    const object = value as {[key: string]: unknown};
    return `{${Object.keys(object).sort().map((key) => `${JSON.stringify(key)}:${canonicalize(object[key])}`).join(',')}}`;
};

export class BattleStore {
    private readonly database: sqlite3.Database;

    constructor(databasePath: string) {
        if (databasePath !== ':memory:') {
            mkdirSync(path.dirname(databasePath), {recursive: true});
        }
        this.database = new sqlite3.Database(databasePath);
    }

    initialize(): Promise<void> {
        return this.run(`CREATE TABLE IF NOT EXISTS battles (
            id TEXT PRIMARY KEY,
            battle_json TEXT NOT NULL UNIQUE,
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )`);
    }

    async save(battle: unknown): Promise<StoredBattle> {
        const battleJson = canonicalize(battle);
        const id = createHash('sha256').update(battleJson).digest('hex');
        await this.run('INSERT OR IGNORE INTO battles (id, battle_json) VALUES (?, ?)', [id, battleJson]);
        return {id, battle: JSON.parse(battleJson)};
    }

    get(id: string): Promise<StoredBattle | undefined> {
        return new Promise((resolve, reject) => {
            this.database.get(
                'SELECT id, battle_json FROM battles WHERE id = ?',
                [id],
                (error: Error | null, row?: {id: string, battle_json: string}) => {
                    if (error) return reject(error);
                    resolve(row ? {id: row.id, battle: JSON.parse(row.battle_json)} : undefined);
                },
            );
        });
    }

    close(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.database.close((error) => error ? reject(error) : resolve());
        });
    }

    private run(sql: string, params: unknown[] = []): Promise<void> {
        return new Promise((resolve, reject) => {
            this.database.run(sql, params, (error) => error ? reject(error) : resolve());
        });
    }
}

export const canonicalBattleJson = canonicalize;
