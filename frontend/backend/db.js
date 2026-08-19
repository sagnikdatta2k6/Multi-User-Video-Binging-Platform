const { Sequelize } = require('sequelize');
const pg = require('pg'); // Force Vercel to bundle pg
const pgHstore = require('pg-hstore'); // Force Vercel to bundle pg-hstore
const path = require('path');

let sequelize;

if (process.env.DATABASE_URL) {
  // Production: PostgreSQL
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  });
} else {
  console.warn('DATABASE_URL is missing. Please provide one.');
  // Return a proxy object during Vercel build time so it doesn't crash, 
  // but throws a clear error if used at runtime
  sequelize = {
    sync: async () => { console.warn('Database sync skipped - no DATABASE_URL'); },
    define: () => {
      return new Proxy({}, {
        get: function(target, prop) {
          return () => { throw new Error("DATABASE_URL is missing in Vercel environment variables. Please add it in Vercel Dashboard -> Settings -> Environment Variables."); };
        }
      });
    },
  };
}

module.exports = sequelize;
