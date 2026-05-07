const sequelize = require('../config/connection');

const {
  Exams,
  ExamQuestions,
  ExamTemplates,
  ExamTemplateQuestions
} = require('../models');

async function migrateExamTemplates() {
  const transaction = await sequelize.transaction();

  try {

    console.log('▶ Starting exam template migration...');

    const exams = await Exams.findAll({
      include: [
        {
          model: ExamQuestions,
          as: 'exam_questions'
        }
      ],
      transaction
    });

    console.log(`✅ Found ${exams.length} exams`);

    for (const exam of exams) {

      console.log(`\n📘 Processing Exam ID ${exam.id}: ${exam.title}`);

      // Create template
      const template = await ExamTemplates.create(
        {
          title: exam.title,
          description: exam.description
        },
        { transaction }
      );

      console.log(`✅ Created template ID ${template.id}`);

      // Copy questions
      for (const question of exam.exam_questions) {

        await ExamTemplateQuestions.create(
          {
            exam_template_id: template.id,

            question_type: question.question_type,

            question_text: question.question_text,

            options: question.options,

            correct_answers: question.correct_answers,

            order: question.order
          },
          { transaction }
        );
      }

      console.log(`✅ Copied ${exam.exam_questions.length} questions`);

      // Link exam → template
      await exam.update(
        {
          exam_template_id: template.id
        },
        { transaction }
      );

      console.log(`✅ Linked exam to template`);
    }

    await transaction.commit();

    console.log('\n🎉 Migration completed successfully');

  } catch (error) {

    await transaction.rollback();

    console.error('\n❌ Migration failed');
    console.error(error);
  }
}

migrateExamTemplates();