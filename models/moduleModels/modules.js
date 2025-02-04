const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

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
            allowNull: false,
            unique: true
        },
        module_id: {
            type: DataTypes.STRING,
            allowNull: true
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        version: {
            type: DataTypes.STRING,
            allowNull: true
        },
        downloadLink: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        language: {
            type: DataTypes.STRING,
            allowNull: true
        },
        packageSize: {
            type: DataTypes.STRING,
            allowNull: true
        },
        redirect_module_id: {
            type: DataTypes.INTEGER,
            allowNull: true, 
            references: {
              model: 'modules',
              key: 'id',
            },
	    onDelete: 'SET NULL',
	    onUpdate: 'CASCADE',
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

Modules.belongsTo(Modules, { as: 'redirectedModule', foreignKey: 'redirect_module_id' });
module.exports = Modules;
