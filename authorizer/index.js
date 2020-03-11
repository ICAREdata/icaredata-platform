const https = require('https');
const querystring = require("querystring");
const {getSecret} = require('../utils/getSecret.js');

// TODO: remove this and get the server a proper certificate
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

exports.handler = async (event) => {
  const secret = await getSecret('Keycloak-Authorizer');
  const authHeader =
    Buffer.from(`${secret.username}:${secret.password}`).toString('base64');
  const options = {
    hostname: process.env.OAUTH_SERVER_HOST,
    port: process.env.OAUTH_SERVER_PORT,
    path: process.env.OAUTH_SERVER_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${authHeader}`,
      'X-Forwarded-Host': 'testing.icaredata.org'
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
        const json = JSON.parse(data);
        console.log('results for token request', json);
        if (json.active) {
          console.log('Allowed request for request');
          accept(generatePolicy('user', 'Allow', event.methodArn));
        } else {
          console.log('Denied request for request');
          accept(generatePolicy('user', 'Deny', event.methodArn));
        }
      });

      resp.on('error', (err) => {
        reject(new Error('Invalid token'));
      });
    });
     let post = querystring.stringify({token:formatToken(event.authorizationToken),
                            token_type_hint: "requesting_party_token"})
    req.write(post);
    req.end();
  });
};

const formatToken = (token) =>{
  return token.replace("Bearer ", '')
}

// Help function to generate an IAM policy
const generatePolicy = (principalId, effect, resource) => {
  const authResponse = {};

  authResponse.principalId = principalId;
  if (effect && resource) {
    const policyDocument = {};
    policyDocument.Version = '2012-10-17';
    policyDocument.Statement = [];
    const statementOne = {};
    statementOne.Action = 'execute-api:Invoke';
    statementOne.Effect = effect;
    statementOne.Resource = resource;
    policyDocument.Statement[0] = statementOne;
    authResponse.policyDocument = policyDocument;
  }

  // Optional output with custom properties of
  // the String, Number or Boolean type.
  // authResponse.context = {
  //     "stringKey": "stringval",
  //     "numberKey": 123,
  //     "booleanKey": true
  // };
  return authResponse;
};
