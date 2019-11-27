const configurationStatement = require('./statement.json');

exports.handler = async (event) => {
  return {statusCode: 200, body: JSON.stringify(configurationStatement)};
};
