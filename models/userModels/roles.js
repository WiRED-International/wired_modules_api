const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class Roles extends Model {};

Roles.init(
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
        modelName: 'Role',
        tableName: 'roles',
        timestamps: true,
        freezeTableName: true,
        underscored: true,
    }
);

module.exports = Roles;