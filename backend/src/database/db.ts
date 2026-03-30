import knex from 'knex';
// @ts-ignore
import config from '../../knexfile.js';

const environment = process.env.NODE_ENV || 'development';
const connectionConfig = (config as any)[environment];

const db = knex(connectionConfig);

export default db;
