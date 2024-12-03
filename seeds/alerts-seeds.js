const  Alerts  = require('../models/alerts');

const alertsData = [
    {
        //id: 1,
        alert: 'This is a default alert message. The message can be updated and deleted from the database. The text color of the alert can also be changed.',
        important: false,
    },
];

const seedAlerts = async () => {
    try {
        const count = await Alerts.count(); 
        if (count === 0) {
            await Alerts.bulkCreate(alertsData);                
            console.log('Alerts seeded successfully!');
        } else {
            console.log('Alerts table already has data, skipping seeding.');
        }
    } catch (error) {
        console.error('Error seeding alerts:', error);
    }
};

module.exports = seedAlerts;