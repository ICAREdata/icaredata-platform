const conformance = require("./conformance.json");

exports.handler = async event => {
  console.log(event);
  console.log(body);
  return { statusCode: 200, body: conformance };
};
