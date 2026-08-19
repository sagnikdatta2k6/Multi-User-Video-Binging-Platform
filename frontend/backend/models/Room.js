const { DataTypes } = require('sequelize');
const sequelize = require('../db');

const Room = sequelize.define('Room', {
  roomId: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true // null means no password required
  },
  hostId: {
    type: DataTypes.UUID,
    allowNull: false
  }
});

module.exports = Room;
