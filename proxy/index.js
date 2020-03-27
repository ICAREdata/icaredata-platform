const https = require('https');
const _ = require('lodash');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const generateQueryUrl = (params) => {
  if (_.isEmpty(params)) {
    return process.env.OAUTH_SERVER_PATH;
  }
  return process.env.OAUTH_SERVER_PATH + '?' + Object.keys(params).map(
      (key) => key + '=' + params[key],
  ).join('&');
};

exports.handler = async (event) => {
  const options = {
    hostname: process.env.OAUTH_SERVER_HOST,
    port: process.env.OAUTH_SERVER_PORT,
    path: generateQueryUrl(event.queryStringParameters),
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Forwarded-Host': 'testing.icaredata.org',
    },
  };

  return new Promise((accept, reject) => {
    const req = https.request(options, (resp) => {
      let data = '';
      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        accept({
          statusCode: 200,
          body: JSON.stringify(data),
        });
      });
    }).on('error', (err) => {
      accept({
        statusCode: 200,
        body: JSON.stringify(err),
      });
    });

    req.write(event.body);
    req.end();
  });
};
