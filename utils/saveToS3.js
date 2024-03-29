const AWS = require('aws-sdk');

module.exports = {
  saveToS3: async (data, bucket) => {
    const s3 = new AWS.S3();
    await s3
      .upload({
        Body: data,
        Bucket: bucket,
        Key: `icare-${Date.now()}.zip`,
      })
      .promise();
    return;
  },
};
