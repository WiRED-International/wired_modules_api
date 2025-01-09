const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/connection');

class Users extends Model {}

Users.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    // user_id: {
    //   type: DataTypes.STRING,
    //   allowNull: false,
    //   unique: true,
    // },
    first_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    last_name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'super_admin'),
      allowNull: false,
      defaultValue: 'user',
    },
    country_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Countries',
        key: 'id',
      },
    },
    city_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Cities',
        key: 'id',
      },
    },
    organization_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Organizations',
        key: 'id',
      },
    },
  },
  {
    sequelize,
    modelName: 'Users',
    tableName: 'users',
    timestamps: true,
    freezeTableName: true,
    underscored: true,
    // hooks: {
    //   beforeCreate: async (user) => {
    //     console.log('Generating user_id...');
    //     if (!user.user_id) {
    //       user.user_id = Math.floor(1000000 + Math.random() * 9000000).toString();
    //     }
    //     console.log('Generated user_id:', user.user_id);
    //   },
    // },  
  }
);

module.exports = Users;