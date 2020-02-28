const {getSecret} = require('../utils/getSecret.js');
const {production} = require('../utils/knexfile.js');
const responses = require('../utils/responses.js');
const fs = require('fs');

exports.handler = async () => {
  const secret = await getSecret('Lambda-RDS-Login');
  production.connection.user = secret.username;
  production.connection.password = secret.password;
  production.connection.ssl = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(__dirname + '/../utils/rds-ca-2019-root.pem'),
  };

  const knex = require('knex')(production);

  const response = await knex
      .from('messages')
      .select('bundle_id')
      .then((r) => {
        console.log(r);
        return responses.response200;
      })
      .catch((e) => {
        console.log(e);
        return responses.response500;
      });

  knex.destroy();
  return response;
};
