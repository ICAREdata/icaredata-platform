module.exports = {
  local: {
    client: 'pg',
    connection: {
      host: 'docker.for.mac.localhost',
      user: process.env.DbUser,
      password: process.env.DbPwd,
      database: 'dev',
    },
  },
  testing: {
    client: 'pg',
    connection: {
      host: 'localhost',
      user: process.env.DbUser, // Must set on local system
      password: process.env.DbPwd, // Must set on local system
      database: 'dev',
    },
  },
};
