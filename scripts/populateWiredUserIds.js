const sequelize = require("../config/connection");
const { Users } = require("../models");

function generateWiredUserId(id) {
  return `WRD${100000 + id}`;
}

async function populateWiredUserIds() {
  const transaction = await sequelize.transaction();

  try {

    const users = await Users.findAll({
      where: {
        wired_user_id: null,
      },
      order: [["id", "ASC"]],
      transaction,
    });

    console.log(`Found ${users.length} users without a WiRED ID.\n`);

    for (const user of users) {

      const wiredUserId = generateWiredUserId(user.id);

      await user.update(
        {
          wired_user_id: wiredUserId,
        },
        { transaction }
      );

      console.log(
        `✓ User ${user.id} (${user.email}) → ${wiredUserId}`
      );
    }

    await transaction.commit();

    console.log("\n✅ Done!");

  } catch (err) {

    await transaction.rollback();

    console.error("\n❌ Error populating WiRED IDs:");
    console.error(err);

  } finally {

    await sequelize.close();

  }
}

populateWiredUserIds();