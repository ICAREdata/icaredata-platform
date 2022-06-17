const path = require('path');
require('dotenv').config({
  path: path.resolve(process.cwd(), './test/fixtures/.env'),
});
const rewire = require('rewire');
const { expect } = require('chai');
const proxyModule = rewire('../proxy');

describe('Proxy', async () => {
  const generateQueryUrl = proxyModule.__get__('generateQueryUrl');
  describe('generateQueryUrl', async () => {
    it('Should properly chain provided params ', async () => {
      const exampleParams = {
        param1: 1,
        param2: 'two',
      };
      expect(generateQueryUrl(exampleParams)).to.equal(
        process.env.OAUTH_SERVER_PATH + '?param1=1&param2=two'
      );
    });
    it('Should generate path with undefined and empty params ', async () => {
      const undefinedParams = undefined;
      const emptyParams = {};
      expect(generateQueryUrl(undefinedParams)).to.equal(
        process.env.OAUTH_SERVER_PATH
      );
      expect(generateQueryUrl(emptyParams)).to.equal(
        process.env.OAUTH_SERVER_PATH
      );
    });
  });

  const generateOptions = proxyModule.__get__('generateOptions');
  describe('generateOptions', async () => {
    it('Should properly generate options with params ', async () => {
      const exampleParams = {
        param1: 1,
        param2: 'two',
      };
      const expectedOptions = {
        hostname: process.env.OAUTH_SERVER_HOST,
        port: process.env.OAUTH_SERVER_PORT,
        path: generateQueryUrl(exampleParams),
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Forwarded-Host': 'testing.icaredata.org',
        },
      };
      expect(generateOptions(exampleParams)).to.eql(expectedOptions);
    });
    it('Should properly generate options with empty params', async () => {
      const undefinedParams = undefined;
      const emptyParams = {};
      const expectedOptions = {
        hostname: process.env.OAUTH_SERVER_HOST,
        port: process.env.OAUTH_SERVER_PORT,
        path: generateQueryUrl(),
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Forwarded-Host': 'testing.icaredata.org',
        },
      };
      expect(generateOptions(undefinedParams)).to.eql(expectedOptions);
      expect(generateOptions(emptyParams)).to.eql(expectedOptions);
    });
  });
});
