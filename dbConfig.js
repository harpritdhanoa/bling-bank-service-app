const dotenv = require('dotenv');
const { Pool } = require("pg");
dotenv.config();
console.log(`Your connection string is ${process.env.CONNECTIONSTRING}`); // 8626

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
    // To Do : Connection string needs to be in a variable for prod use.
    connectionString: `${process.env.CONNECTIONSTRING}`,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = {pool};

