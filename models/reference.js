const { Model, DataTypes } = require('sequelize');

const sequelize = require('../config/connection');

const Module = require('./modules');

class Reference extends Model {}

const Reference = sequelize.define('Reference', {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true
    },
    referenceName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    moduleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Module,
        key: 'id'
      }
    }
  }, {
    sequelize,
    modelName: 'Reference',
    tableName: 'references',
    timestamps: false,
    freezeTableName: true,
    underscored: true,
  });

  Module.hasMany(Reference, {
    foreignKey: 'moduleId',
    as: 'references'
  });
  
  Reference.belongsTo(Module, {
    foreignKey: 'moduleId',
    as: 'module'
  });
  
  module.exports = Reference;