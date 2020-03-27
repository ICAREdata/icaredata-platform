module.exports = {
  production: {
    client: 'pg',
    connection: {
      host: 'icare-database.cstgmm6byetb.us-east-1.rds.amazonaws.com',
      port: 5432,
      database: 'icare',
    },
  },
  testing: {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5433,
      user: process.env.DbUser, // Must set on local system
      password: process.env.DbPwd, // Must set on local system
      database: 'icare',
    },
  },
};
