
const _ = require('lodash');
const {expect} = require('chai');
const axios = require('axios');

const options = require('../utils/knexfile.js');
const knex = require('knex')(options.testing);

const originalMessage = require('./fixtures/messaging/message.json');

describe('FHIR messaging endpoint', async () => {
  let message;

  const apiGateway = axios.create({
    baseURL: 'http://localhost:3000',
    timeout: 30000,
  });

  const assertStatus = async (msg, expectedStatus) => {
    const resp = await apiGateway.post(
        '/DSTU2/$process-message',
        JSON.stringify(msg))
        .then((r) => r)
        .catch((e) => e.response);

    expect(resp).to.have.property('status');
    expect(resp.status).to.equal(expectedStatus);
  };

  beforeEach(async () => {
    message = _.cloneDeep(originalMessage);
  });

  it('should post a valid FHIR Message', async () => {
    await assertStatus(message, 200);
  });

  it('should post multiple valid FHIR Messages', async () => {
    await assertStatus(message, 200);
    const message2 = _.cloneDeep(message);
    // Set different id than original
    message2.id = '10801e28-be34-4b8c-9848-a2755f78f205';
    await assertStatus(message2, 200);
  });

  it('should not post the same FHIR Message twice', async () => {
    await assertStatus(message, 200);
    await assertStatus(message, 500);
  });

  // it('should not post a FHIR Message without a MessageHeader', async () => {
  //   assertStatus(message, 400);
  // });

  // it('should not post a FHIR Message without a Parameters', async () => {
  //   assertStatus(message, 400);
  // });

  // it('should not post a FHIR Message without a Patient', async () => {
  //   assertStatus(message, 400);
  // });

  // it('should not post a FHIR Message without a bundle id', async () => {
  //   message.id === undefined;
  //   assertStatus(message, 400);
  // });

  // it('should not post a FHIR Message without a timestamp', async () => {
  //   assertStatus(message, 400);
  // });

  // it('should not post a FHIR Message without a site id', async () => {
  //   assertStatus(message, 400);
  // });

  // it('should not post a FHIR Message without a trial id', async () => {
  //   assertStatus(message, 200);
  // });

  // it('should not post a FHIR Message without a MRN', async () => {
  //   assertStatus(message, 400);
  // });

  afterEach(() => knex('messages').del());

  after(() => knex.destroy());
});
