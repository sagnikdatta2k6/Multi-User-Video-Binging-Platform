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
  // Development: SQLite
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false
  });
}

module.exports = sequelize;
