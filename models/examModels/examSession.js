const { Model, DataTypes } = require('sequelize');
const sequelize = require('../../config/connection');

class ExamSession extends Model {};

ExamSession.init(
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
            }
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
        created_at: {
            type: DataTypes.DATE,
            allowNull: false
        },
    }, 
    {
        sequelize,
        modelName: 'ExamSession',
        tableName: 'exam_session',
        timestamps: true,
        freezeTableName: true,
        underscored: true,
    }
);

module.exports = ExamSession;