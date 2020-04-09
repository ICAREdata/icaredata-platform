const fs = require('fs');
const {getSecret} = require('./getSecret');

const getDatabaseConfiguration = async (login) => {
  const secret = await getSecret(login);
  return {
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST || '',
      port: process.env.DATABASE_PORT || 8080,
      database: process.env.DATABASE_NAME || '',
      user: secret.username || '',
      password: secret.password || '',
      ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(__dirname + '/rds-ca-2019-root.pem'),
      },
    },
  };
};

module.exports = {
  getDatabaseConfiguration,
};
