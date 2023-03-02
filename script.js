const fhirpath = require('fhirpath');
const { getBundleResourcesByType } = require('./utils/fhirUtils');
const exampleMessage = require('./test/fixtures/messaging/exampleR4Message.json');

// Get a list of all resourceTypes in the ContainedBundle
const getResourceTypesInBundle = (containedBundle) =>
  fhirpath.evaluate(
    containedBundle,
    'Bundle.entry.resource.resourceType.distinct()'
  );
// For a given resourceType, determine how many of those resources are on a ContainedBundle
const getResourceCount = (containedBundle, resourceType) => {
  return fhirpath.evaluate(
    containedBundle,
    `Bundle.entry.resource.where(resourceType = '${resourceType}').count()`
  );
};

// // Get some metadata about the bundle for logging
const resourceTypes = getResourceTypesInBundle(containedBundle);
const siteId = 'LOCAL-TEST';
console.log(`${siteId}: Contained bundle provides the following resources`);
resourceTypes.forEach((resourceType) => {
  console.log(
    `${siteId}: ${resourceType} | ${getResourceCount(
      containedBundle,
      resourceType
    )}`
  );
});
