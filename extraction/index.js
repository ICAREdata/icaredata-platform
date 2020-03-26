const { getSecret } = require('../utils/getSecret.js');
const { saveToS3 } = require('../utils/saveToS3.js');
const { production } = require('../utils/knexfile.js');
const responses = require('../utils/responses.js');
const exceljs = require('exceljs');
const Stream = require('stream');
const fs = require('fs');
const archiver = require('archiver');
const fhirpath = require('fhirpath');
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

  // Create separate worksheets for each resource
  const diseaseStatusWorksheet = workbook.addWorksheet('Disease Status');
  diseaseStatusWorksheet.columns = [
    { header: 'Effective Date', key: 'effectiveDate', width: 30 },
    { header: 'Cancer Type', key: 'cancerType', width: 30 },
    { header: 'Coded Value', key: 'codedValue', width: 30 },
    { header: 'Based On', key: 'basedOn', width: 30 },
    { header: 'Subject ID', key: 'subjectId', width: 30 },
    { header: 'Trial ID', key: 'trialId', width: 30 },
    { header: 'Site ID', key: 'siteId', width: 30 }
  ];

  const treatmentPlanChangeWorksheet = workbook.addWorksheet('Treatment Plan Change');
  treatmentPlanChangeWorksheet.columns = [
    { header: 'Effective Date', key: 'effectiveDate', width: 30 },
    { header: 'Coded Value', key: 'codedValue', width: 30 },
    { header: 'Based On', key: 'basedOn', width: 30 },
    { header: 'Subject ID', key: 'subjectId', width: 30 },
    { header: 'Trial ID', key: 'trialId', width: 30 },
    { header: 'Site ID', key: 'siteId', width: 30 }
  ];

  const stream = new Stream.PassThrough();
  const knex = require('knex')(production);
  const response = await knex('data.messages')
    .select('*')
    .then(async data => {
      // Loop through all rows in data.messages
      data.forEach(d => {
        const { bundle, subject_id, trial_id, site_id } = d;

        const bundleEntry = getBundleResourcesByType(
          bundle,
          'Bundle',
          {},
          true
        );
        console.log('bundle: ', bundleEntry);
        const dsResources = getBundleResourcesByType(
          bundleEntry,
          'Observation',
          {},
          false
        );
        console.log('dsResources: ', dsResources);
        dsResources.forEach(resource => {
          console.log('resource: ', resource);
          diseaseStatusWorksheet.addRow({
            effectiveDate: resource.effectiveDateTime,
            cancerType: resource.focus[0].reference,
            codedValue: resource.valueCodeableConcept,
            subjectId: subject_id,
            trialId: trial_id,
            siteId: site_id
          });
        });
      });
      return await workbook.xlsx
        .write(stream)
        .then(async () => {
          const s3Password = await getSecret('S3-Zip-Password');
          const archive = archiver.create('zip-encrypted', {
            zlib: { level: 8 },
            encryptionMethod: 'aes256',
            password: s3Password.password
          });
          archive.append(stream, { name: 'icare.xlsx' });
          archive.finalize();
          await saveToS3(archive, 'icaredata-dev-extracted-data');
          return responses.response200;
        })
        .catch(e => {
          console.log(e);
          return responses.response500;
        });
    })
    .catch(e => {
      console.log(e);
      return responses.response500;
    });

  knex.destroy();

  return response;
};

// Utility function to get the resources of a type from our message bundle
// Optionally get only the first resource of that type via 'first' parameter
const getBundleResourcesByType = (message, type, context = {}, first) => {
  const resources = fhirpath.evaluate(
      message,
      `Bundle.entry.where(resource.resourceType='${type}').resource`,
      context,
  );

  if (resources.length > 0) {
    return first ? resources[0] : resources;
  } else {
    return first ? null : [];
  }
};
