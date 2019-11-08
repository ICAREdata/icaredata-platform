const jwt = require('jsonwebtoken');
const fs = require('fs');

const payload = {};

const privateKey = fs.readFileSync('test-keys/private.key', 'utf8');
// const publicKey = fs.readFileSync('test-keys/public.key', 'utf8');

const options = {
  algorithm: 'RS256',
  keyid: 'e34bd62e-b02d-4607-b360-afbeaeb986c7', // The identifier of the key-pair used to sign this JWT
  expiresIn: '5m', // This time SHALL be no more than five minutes in the future
  issuer: 'test-client', // the client's client_id
  subject: 'test-client', // this is the same as the value for the iss claim
  audience: 'https://localhost:9000/oauth2/token', // The FHIR authorization server's token URL
  jwtid: 'c08cad54-687f-4b35-90e9-cf108855006e',
};

const token = jwt.sign(payload, privateKey, options);

console.log(token);
