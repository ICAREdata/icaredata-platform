
const _ = require('lodash');
const {expect} = require('chai');
const axios = require('axios');

const {testing} = require('../../utils/knexfile.js');
const knex = require('knex')(testing);

const originalMessage = require('../fixtures/messaging/message.json');

describe('FHIR Messaging endpoint', async () => {
  let message;

  const apiGateway = axios.create({
    baseURL: 'http://testing.icaredata.org',
    timeout: 30000,
  });

  const assertStatus = async (msg, expectedStatus) => {
    const resp = await apiGateway.post(
        '/$process-message',
        msg)
        .then((r) => r)
        .catch((e) => e.response);

    expect(resp).to.have.property('status');
    expect(resp.status).to.equal(expectedStatus);
  };

  const assertNum = async (expectedNum) => {
    const rows = await knex.from('messages').select('id').then((r) => r);
    expect(rows.length).to.equal(expectedNum);
  };

  before(() => knex('messages').del());

  beforeEach(async () => {
    message = _.cloneDeep(originalMessage);
    await assertNum(0);
  });

  it('should post a valid FHIR Message', async () => {
    await assertStatus(message, 200);
    await assertNum(1);
  });

  it('should post multiple valid FHIR Messages', async () => {
    await assertStatus(message, 200);
    await assertNum(1);
    const message2 = _.cloneDeep(message);
    // Set different id than original
    message2.id = '00000000-0000-0000-0000-000000000000';
    await assertStatus(message2, 200);
    await assertNum(2);
  });

  it('should not post the same FHIR Message twice', async () => {
    await assertStatus(message, 200);
    await assertNum(1);
    await assertStatus(message, 500);
    await assertNum(1);
  });

  it('should not post a FHIR Message without a MessageHeader', async () => {
    _.set(message, 'entry[0]', undefined);
    await assertStatus(message, 400);
    await assertNum(0);
  });

  it('should not post a FHIR Message without a Parameters', async () => {
    _.set(message, 'entry[1]', undefined);
    await assertStatus(message, 400);
    await assertNum(0);
  });

  it('should not post a FHIR Message without a Patient', async () => {
    _.set(message, 'entry[2]', undefined);
    await assertStatus(message, 400);
    await assertNum(0);
  });

  it('should not post a FHIR Message without a bundle id', async () => {
    message.id = undefined;
    await assertStatus(message, 400);
    await assertNum(0);
  });

  it('should not post a FHIR Message without a timestamp', async () => {
    _.set(message, 'entry[0].resource.timestamp', undefined);
    await assertStatus(message, 400);
    await assertNum(0);
  });

  it('should not post a FHIR Message without a site id', async () => {
    _.set(message, 'entry[1].resource.parameter[1]', undefined);
    await assertStatus(message, 400);
    await assertNum(0);
  });

  it('should not post a FHIR Message without a trial id', async () => {
    _.set(message, 'entry[1].resource.parameter[0]', undefined);
    await assertStatus(message, 400);
    await assertNum(0);
  });

  afterEach(() => knex('messages').del());

  after(() => knex.destroy());
});
