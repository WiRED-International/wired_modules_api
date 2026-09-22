const { Op } = require('sequelize');
const { Classes } = require('../../models');

const completeExpiredClassesJob = async () => {
  const today = new Date().toISOString().split('T')[0];

  const [updatedCount] = await Classes.update(
    {
      status: 'completed',
    },
    {
      where: {
        status: 'active',
        end_date: {
          [Op.lt]: today,
        },
      },
    }
  );

  if (updatedCount > 0) {
    console.log(
      `Automatically completed ${updatedCount} expired class(es).`
    );
  }

  return updatedCount;
};

module.exports = completeExpiredClassesJob;