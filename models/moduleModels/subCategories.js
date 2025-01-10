const { Model, DataTypes } = require('sequelize');

const sequelize = require('../../config/connection');

class SubCategories extends Model {};

SubCategories.init(
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
        category_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: 'categories',
              key: 'id',
            },
	    onDelete: 'CASCADE',
	    onUpdate: 'CASCADE',
        },
    }, {
        sequelize,
        modelName: 'SubCategories',
        tableName: 'subcategories',
        timestamps: false,
        freezeTableName: true,
        underscored: true,
    }
);

module.exports = SubCategories;

