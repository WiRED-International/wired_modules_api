const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class Alerts extends Model {};

Alerts.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        alert: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        important: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
        },
    }, {
        sequelize,
        modelName: 'Alerts',
        tableName: 'alerts',
        timestamps: true,
        freezeTableName: true,
        underscored: true,
    }   
);

module.exports = Alerts;
