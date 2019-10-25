module.exports = {
    client: 'pg',
    connection: {
        host: 'docker.for.mac.localhost',
        user: process.env.DbUser,
        password: process.env.DbPwd,
        database: 'dev'
    }
}