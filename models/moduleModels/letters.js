const { Model, DataTypes } = require('sequelize');

const sequelize = require('../../config/connection');

class Letters extends Model {};

Letters.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        letters: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        sequelize,
        modelName: 'Letters',
        tableName: 'letters',
        timestamps: false,
        freezeTableName: true,
        underscored: true,
    }
);

module.exports = Letters;