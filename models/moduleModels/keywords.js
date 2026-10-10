const { Model, DataTypes } = require('sequelize');

const sequelize = require('../../config/connection');

class Keywords extends Model {}

Keywords.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
    }, {
        sequelize,
        modelName: 'Keywords',
        tableName: 'keywords',
        timestamps: true,
        freezeTableName: true,
        underscored: true,
    }
);

module.exports = Keywords;