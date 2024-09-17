const { Model, DataTypes } = require('sequelize');

const sequelize = require('../config/connection');

class Modules extends Model {}

Modules.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.STRING,
            allowNull: false
        },
        topics: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false
        },
        letters: {
            type: DataTypes.ARRAY(DataTypes.STRING),
            allowNull: false
        },
        version: {
            type: DataTypes.STRING,
            allowNull: false
        },
        downloadLink: {
            type: DataTypes.STRING,
            allowNull: false
        },
        packageSize: {
            type: DataTypes.STRING,
            allowNull: false
        },
        isReference: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
    }, {
        sequelize,
        modelName: 'Modules',
        tableName: 'modules',
        timestamps: false,
        freezeTableName: true,
        underscored: true,
    }
);

module.exports = Modules;