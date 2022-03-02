const fs = require('fs');
const {getSecret} = require('./getSecret');

const getDatabaseConfiguration = async (login) => {
  const secret = await getSecret(login);
  const caFileName = process.env.CA_FILE_NAME || 'us-east-1-bundle.pem';
  return {
    client: 'pg',
    connection: {
      host: process.env.DATABASE_HOST || '',
      port: process.env.DATABASE_PORT || 5432,
      database: process.env.DATABASE_NAME || 'icare',
      user: secret.username || '',
      password: secret.password || '',
      ssl: {
        rejectUnauthorized: true,
        ca: fs.readFileSync(__dirname + `/${caFileName}`),
      },
    },
  };
};

module.exports = {
  getDatabaseConfiguration,
};
