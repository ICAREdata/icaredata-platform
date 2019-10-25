const options = require('./knexfile.js');
const knex = require('knex')(options);

exports.handler = async event => {
  return knex
    .insert([JSON.parse(event.body)])
    .into('trial_data')
    .then(r => {
      return { statusCode: 200, body: 'Successfully inserted data.' };
    })
    .catch(e => {
      return { statusCode: 400, body: 'Error uploading data.' };
    });
};
