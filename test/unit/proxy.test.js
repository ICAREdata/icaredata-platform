const path = require('path');
require('dotenv').config({path: path.resolve(process.cwd(), './test/fixtures/.env')});
const rewire = require('rewire');
const proxyModule = rewire('../../proxy');
const {expect} = require('chai');

const generateQueryUrl = proxyModule.__get__('generateQueryUrl');
describe('Proxy - generateQueryUrl', async () => {
  it('Should properly chain provided params ', async () => {
    const undefinedParams = undefined;
    const emptyParams = {};
    const exampleParams = {
      param1: 1,
      param2: 'two',
    };
    expect(generateQueryUrl(undefinedParams)).to.equal(process.env.OAUTH_SERVER_PATH);
    expect(generateQueryUrl(emptyParams)).to.equal(process.env.OAUTH_SERVER_PATH);
    expect(generateQueryUrl(exampleParams)).to.equal(process.env.OAUTH_SERVER_PATH + '?param1=1&param2=two');
  });
});
