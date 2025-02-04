const { Downloads } = require('../models');

const seedDownloads = async () => {
    try {
        await Downloads.bulkCreate([
            {
              module_id: 1,
              package_id: null,
              latitude: 40.712776, // New York City, USA
              longitude: -74.005974,
              download_date: Math.floor(new Date('2024-01-01T12:00:00Z').getTime() / 1000), // 2024-01-01 12:00:00 UTC
            },
            {
              module_id: 2,
              package_id: null,
              latitude: 34.052235, // Los Angeles, USA
              longitude: -118.243683,
              download_date: Math.floor(new Date('2023-11-15T09:30:00Z').getTime() / 1000), // 2023-11-15 09:30:00 UTC
            },
            {
              module_id: null,
              package_id: 1,
              latitude: 48.856613, // Paris, France
              longitude: 2.352222,
              download_date: Math.floor(new Date('2023-12-25T16:45:00Z').getTime() / 1000), // 2023-12-25 16:45:00 UTC
            },
            {
              module_id: null,
              package_id: 2,
              latitude: 35.689487, // Tokyo, Japan
              longitude: 139.691711,
              download_date: Math.floor(new Date('2023-05-10T08:00:00Z').getTime() / 1000), // 2023-05-10 08:00:00 UTC
            },
            {
              module_id: 3,
              package_id: null,
              latitude: -33.868820, // Sydney, Australia
              longitude: 151.209290,
              download_date: Math.floor(Date.now() / 1000), // Defaults to current timestamp
            },
            {
              module_id: 4,
              package_id: null,
              latitude: 51.507222, // London, UK
              longitude: -0.127500,
              download_date: Math.floor(new Date('2024-02-01T14:20:00Z').getTime() / 1000), // 2024-02-01 14:20:00 UTC
            },
            {
              module_id: null,
              package_id: 3,
              latitude: 19.432608, // Mexico City, Mexico
              longitude: -99.133209,
              download_date: Math.floor(new Date('2023-07-01T10:30:00Z').getTime() / 1000), // 2023-07-01 10:30:00 UTC
            },
            {
              module_id: 5,
              package_id: null,
              latitude: 55.755825, // Moscow, Russia
              longitude: 37.617298,
              download_date: Math.floor(Date.now() / 1000), // Defaults to current timestamp
            },
            {
              module_id: null,
              package_id: 3,
              latitude: -23.550520, // São Paulo, Brazil
              longitude: -46.633308,
              download_date: Math.floor(new Date('2023-11-10T17:00:00Z').getTime() / 1000), // 2023-11-10 17:00:00 UTC
            },
            {
              module_id: 6,
              package_id: null,
              latitude: 39.904202, // Beijing, China
              longitude: 116.407394,
              download_date: Math.floor(new Date('2023-09-12T07:00:00Z').getTime() / 1000), // 2023-09-12 07:00:00 UTC
            },
        ]);
    } catch (err) {
        console.error('Error seeding downloads:', err);
    }
};

module.exports = seedDownloads;
