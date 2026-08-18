const { Sequelize } = require('sequelize');
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
  // Return a dummy object during Vercel build time so it doesn't crash
  sequelize = {
    sync: async () => {},
    define: () => ({}),
  };
}

module.exports = sequelize;
