const https = require('https');
const querystring = require('querystring');
const _ = require('lodash');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Generate a url joining env-specific server path and provided params
 * @param {params} params the request query params
 * @return {int} The server-path with our query params properly appended
 */
function generateQueryUrl(params) {
  if (_.isEmpty(params)) {
    return process.env.OAUTH_SERVER_PATH;
  }
  return process.env.OAUTH_SERVER_PATH + '?' + querystring.stringify(params);
};

/**
 * Generate request options based on env variables and search params
 * @param {params} params the request query params
 * @return {int} An options object for requests
 */
function generateOptions(params) {
  const options = {
    hostname: process.env.OAUTH_SERVER_HOST,
    port: process.env.OAUTH_SERVER_PORT,
    path: generateQueryUrl(params),
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Forwarded-Host': 'testing.icaredata.org',
    },
  };
  return options;
};

exports.handler = async (event) => {
  const options = generateOptions(event.quiceryStringParameters);

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
