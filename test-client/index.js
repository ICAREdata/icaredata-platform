const jwt = require('jsonwebtoken');
const fs = require('fs');

const payload = {};

const privateKey = fs.readFileSync('test-keys/private.key', 'utf8');
const publicKey = fs.readFileSync('test-keys/public.key', 'utf8');

const options = {
  algorithm: 'RS384',
  keyid: 'test-client', // The identifier of the key-pair used to sign this JWT
  expiresIn: '5m', // This time SHALL be no more than five minutes in the future
  issuer: 'test-client', // the client's client_id
  subject: 'test-client', // this is the same as the value for the iss claim
  audience: 'localhost:9000/token', // The FHIR authorization server's token URL
};

const token = jwt.sign(payload, privateKey, options);

console.log(token);
