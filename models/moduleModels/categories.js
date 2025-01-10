const { Model, DataTypes } = require('sequelize');

const sequelize = require('../../config/connection');

class Categories extends Model {}

Categories.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
    }, {
        sequelize,
        modelName: 'Categories',
        tableName: 'categories',
        timestamps: false,
        freezeTableName: true,
        underscored: true,
    }
);

// Categories.hasMany(SubCategories, { as: 'subCategories', foreignKey: 'category_id' });


module.exports = Categories;
