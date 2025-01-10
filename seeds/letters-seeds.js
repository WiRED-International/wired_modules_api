const Letters = require('../models/moduleModels/letters');

const lettersData = [
    {
        letters: 'A',
    },
    {
        letters: 'B',
    },
    {
        letters: 'C',
    },
    {
        letters: 'D',
    },        
    {
        letters: 'E',
    },
    {
        letters: 'F',
    },
    {
        letters: 'G',
    },
    {
        letters: 'H',
    },
    {
        letters: 'I',
    },
    {
        letters: 'J',
    },
    {
        letters: 'K',
    },
    {
        letters: 'L',
    },
    {
        letters: 'M',
    },
    {
        letters: 'N',
    },
    {
        letters: 'O',
    },
    {
        letters: 'P',
    },
    {
        letters: 'Q',
    },
    {
        letters: 'R',
    },
    {
        letters: 'S',
    },
    {
        letters: 'T',
    },
    {
        letters: 'U',
    },
    {
        letters: 'V',
    },
    {
        letters: 'W',
    },
    {
        letters: 'X-Y-Z',
    },
];

const seedLetters = async () => {
    try {
        const count = await Letters.count(); 
        if (count === 0) {
            await Letters.bulkCreate(lettersData);
            console.log('Letters seeded successfully!');
        } else {
            console.log('Letters table already has data, skipping seeding.');
        }
    } catch (error) {
        console.error('Error seeding letters:', error);
    }
};

module.exports = seedLetters;