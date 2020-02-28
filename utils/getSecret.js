const AWS = require('aws-sdk');

module.exports = {
  getSecret: async (secretId) => {
    const secretsManager = new AWS.SecretsManager({region: 'us-east-1'});
    const secret = await secretsManager.getSecretValue({
      SecretId: secretId,
    }).promise();
    return JSON.parse(secret.SecretString);
  },
};
