const { Client } = require('pg')

/**db credentials */

  const client = new Client({
    user: '<dbuser>',
    host: 'localhost',
    database: '<dbname>',
    password: '<password>',
    port: 5432,
  })

  

  module.exports = { client }
