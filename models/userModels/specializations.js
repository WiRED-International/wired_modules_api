const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class Specializations extends Model {};

Specializations.init(
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
        modelName: 'Specialization',
        tableName: 'specializations',
        timestamps: true,
        freezeTableName: true,
        underscored: true,
    }
);

module.exports = Specializations;