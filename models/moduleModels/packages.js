const { Model, DataTypes } = require('sequelize');

const sequelize = require('../../config/connection');

class Packages extends Model {};

Packages.init(
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
            unique: true,
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        letters: {
            type: DataTypes.STRING,
            allowNull: false
        },
        version: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        downloadLink: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        packageSize: {
            type: DataTypes.STRING,
            allowNull: true
        },
    }, {
        sequelize,
        modelName: 'Packages',
        tableName: 'packages',
        timestamps: false,
        freezeTableName: true,
        underscored: true,
    }           
);

module.exports = Packages;
