const {getSecret} = require('../utils/getSecret.js');
const {saveToS3} = require('../utils/saveToS3.js');
const {production} = require('../utils/knexfile.js');
const responses = require('../utils/responses.js');
const exceljs = require('exceljs');
const Stream = require('stream');
const fs = require('fs');
const archiver = require('archiver');
archiver.registerFormat('zip-encrypted', require('archiver-zip-encrypted'));

exports.handler = async () => {
  const login = await getSecret('Lambda-RDS-Login');
  production.connection.user = login.username;
  production.connection.password = login.password;
  production.connection.ssl = {
    rejectUnauthorized: true,
    ca: fs.readFileSync(__dirname + '/../utils/rds-ca-2019-root.pem'),
  };

  const workbook = new exceljs.Workbook();
  workbook.creator = 'icaredata';
  workbook.created = workbook.modified = new Date();
  const worksheet = workbook.addWorksheet('Data');
  worksheet.columns = [{header: 'bundle_id', key: 'bundle_id', width: 30}];
  const stream = new Stream.PassThrough();

  const knex = require('knex')(production);

  const response = await knex
      .from('data.messages')
      .select('bundle_id')
      .then(async (r) => {
        for (const row of r) {
          worksheet.addRow(row);
        }
        return await workbook.xlsx.write(stream)
            .then(async () => {
              const s3Password = await getSecret('S3-Zip-Password');
              const archive = archiver.create(
                  'zip-encrypted',
                  {
                    zlib: {level: 8},
                    encryptionMethod: 'aes256',
                    password: s3Password.password,
                  },
              );
              archive.append(stream, {name: 'icare.xlsx'});
              archive.finalize();
              await saveToS3(archive, 'icaredata-dev-extracted-data');
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
