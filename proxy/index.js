const https = require('https');
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const generateQueryUrl = (params) => {
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
  };

  return new Promise((accept, reject) => {
    const req = https.request(options, (resp) => {
      const data = '';
      // A chunk of data has been recieved.
      resp.on('data', (chunk) => {
        data += chunk;
      });

      // The whole response has been received. Print out the result.
      resp.on('end', () => {
        accept({statusCode: 200, body: JSON.stringify(data)});
      });
    }).on('error', (err) => {
      accept({statusCode: 200, body: JSON.stringify(err)});
    });

    req.write('');
    req.end();
  });
};
