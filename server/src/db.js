const { Sequelize } = require('sequelize');
const { Client } = require('pg');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'chat_app',
};

let sequelize;

async function initDatabase() {
  // First, connect to the default 'postgres' database to ensure the target database exists
  const client = new Client({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: 'postgres', // connect to default db
  });

  try {
    await client.connect();
    // Check if the database exists
    const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbConfig.database]);
    
    if (res.rowCount === 0) {
      console.log(`Database '${dbConfig.database}' does not exist. Creating...`);
      await client.query(`CREATE DATABASE ${dbConfig.database}`);
      console.log(`Database '${dbConfig.database}' created successfully!`);
    } else {
      console.log(`Database '${dbConfig.database}' already exists.`);
    }
  } catch (err) {
    console.error('Failed to check or create database. Please ensure your PostgreSQL service is running and credentials are correct.', err.message);
  } finally {
    await client.end();
  }

  // Now connect to the chat_app database using Sequelize
  sequelize = new Sequelize(dbConfig.database, dbConfig.user, dbConfig.password, {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: 'postgres',
    logging: false, // set to console.log to see SQL queries
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });

  try {
    await sequelize.authenticate();
    console.log('Connection to PostgreSQL database has been established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database via Sequelize:', error);
    throw error;
  }
}

module.exports = {
  initDatabase,
  getSequelize: () => sequelize,
};
