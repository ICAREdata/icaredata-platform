const AWS = require('aws-sdk');

module.exports = {
  getSecret: async (secretId) => {
    const region = process.env.REGION || 'us-east-1';
    const secretsManager = new AWS.SecretsManager({ region });
    const secret = await secretsManager
      .getSecretValue({
        SecretId: secretId,
      })
      .promise();
    return JSON.parse(secret.SecretString);
  },
};
