const { Model, DataTypes } = require('sequelize');

const sequelize = require('../config/connection');
const SubCategories = require('./subCategories');

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
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        letters: {
            type: DataTypes.STRING,
            allowNull: false
        },
        version: {
            type: DataTypes.STRING,
            allowNull: true
        },
        is_downloadable: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
        },
        downloadLink: {
            type: DataTypes.STRING,
            allowNull: true,
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

// Modules.belongsToMany(SubCategories, { as: 'subCategories', through: 'module_subcategory', foreignKey: 'module_id' });

module.exports = Modules;
