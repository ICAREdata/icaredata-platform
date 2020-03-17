const {getSecret} = require('../utils/getSecret.js');
const {saveToS3} = require('../utils/saveToS3.js');
const {production} = require('../utils/knexfile.js');
const responses = require('../utils/responses.js');
const exceljs = require('exceljs');
const Stream = require('stream');
const fs = require('fs');

exports.handler = async () => {
  const secret = await getSecret('Lambda-RDS-Login');
  production.connection.user = secret.username;
  production.connection.password = secret.password;
  production.connection.ssl = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(__dirname + '/../utils/rds-ca-2019-root.pem'),
  };

  const knex = require('knex')(production);

  const workbook = new exceljs.Workbook();
  workbook.creator = 'icaredata';
  workbook.created = workbook.modified = new Date();
  const worksheet = workbook.addWorksheet('Data');
  worksheet.columns = [{header: 'bundle_id', key: 'bundle_id', width: 30}];
  const stream = new Stream.PassThrough();

  const response = await knex
      .from('data.messages')
      .select('bundle_id')
      .then(async (r) => {
        console.log(r);
        for (const row of r) {
          worksheet.addRow(row);
        }
        return await workbook.xlsx.write(stream)
            .then(async () => {
              await saveToS3(stream, 'icaredata-dev-extracted-data');
              return responses.response200;
            })
            .catch((e) => {
              console.log(e);
              return responses.response500;
            });
      })
      .catch((e) => {
        console.log(e);
        return responses.response500;
      });

  knex.destroy();

  return response;
};
