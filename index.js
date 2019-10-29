const {Client} = require('pg');
const client = new Client();

exports.handler = async (event) => {
  await client.connect();
  const resp = await client.query('SELECT NOW()');
  await client.end();
  return {statusCode: 200, body: {dbTime: resp.rows[0].now}};
};
