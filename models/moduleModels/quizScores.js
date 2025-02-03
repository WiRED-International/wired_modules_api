const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class QuizScores extends Model {}

QuizScores.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    module_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'modules',
            key: 'id',
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
    },
    score: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
    },
    date_taken: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
  },
{
    sequelize,
    modelName: 'QuizScores',
    tableName: 'quiz_scores',
    timestamps: true,
    freezeTableName: true,
    underscored: true, 
    
  // Add a unique constraint on the combination of user_id and module_id
  indexes: [
    {
      unique: true,
      fields: ['user_id', 'module_id'],
    },
  ],
}
);

module.exports = QuizScores;
        