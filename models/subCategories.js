const { Model, DataTypes } = require('sequelize');

const sequelize = require('../config/connection');
const Categories = require('./categories');
const Modules = require('./modules');

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
              model: 'Categories',
              key: 'id',
            },
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

// SubCategories.belongsTo(Categories, { as: 'category', foreignKey: 'category_id' });

// SubCategories.belongsToMany(Modules, { as: 'modules', through: 'module_subcategory', foreignKey: 'sub_category_id' });

module.exports = SubCategories;