module.exports = {
  production: {
    client: 'pg',
    connection: {
      host: 'database.cstgmm6byetb.us-east-1.rds.amazonaws.com',
      port: 5432,
      user: process.env.DbUser,
      password: process.env.DbPwd,
      database: 'icare',
    },
  },
  local: {
    client: 'pg',
    connection: {
      host: 'docker.for.mac.localhost',
      port: 5433,
      user: process.env.DbUser,
      password: process.env.DbPwd,
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
