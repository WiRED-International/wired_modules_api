const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class Countries extends Model {}

Countries.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
  },
  {
    sequelize,
    modelName: 'Countries',
    tableName: 'countries',
    timestamps: false,
    freezeTableName: true,
    underscored: true,
  }
);

module.exports = Countries;