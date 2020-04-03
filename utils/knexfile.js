module.exports = {
  production: {
    client: 'pg',
    connection: {
      host: 'icare-database.cstgmm6byetb.us-east-1.rds.amazonaws.com',
      port: 5432,
      database: 'icare',
    },
  },
};
