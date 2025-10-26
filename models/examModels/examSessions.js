const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class ExamSessions extends Model {};

ExamSessions.init(
    {
        id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true
        },
        exam_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'exams',
                key: 'id'
            },
            onDelete: 'CASCADE'
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            },
        },
        attempt_number: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        submitted_at: {
            type: DataTypes.DATE
        },
        answers: {
            type: DataTypes.JSON
        },
        score: {
            type: DataTypes.FLOAT
        },
        active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
    }, 
    {
        sequelize,
        modelName: 'ExamSessions',
        tableName: 'exam_sessions',
        timestamps: true,
        freezeTableName: true,
        underscored: true,
    }
);

module.exports = ExamSessions;