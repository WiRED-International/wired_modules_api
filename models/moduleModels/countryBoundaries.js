// models/Country.js
const { DataTypes, Model } = require('sequelize');
const sequelize = require('../../config/connection'); // Adjust the path if needed

class CountryBoundaries extends Model {}

CountryBoundaries.init({
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  boundaries: {
    type: DataTypes.JSON, // Store GeoJSON as JSON object
    allowNull: false,
  },
}, {
  sequelize,
  freezeTableName: true, 
  tableName: 'country_boundaries', 
});

module.exports = CountryBoundaries;
