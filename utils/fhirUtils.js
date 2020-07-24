const fhirpath = require('fhirpath');

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

// Utility function to get the extensions on an array of extension by url
// Optionally get only the first extension of that url via 'first' parameter
const getExtensionsByUrl = (extArr, url, first) => {
  const extensions = extArr ? extArr.filter((e) => e.url === url) : [];

  if (extensions.length > 0) {
    return first ? extensions[0] : extensions;
  } else {
    return first ? null : [];
  }
};

module.exports = {
  getBundleResourcesByType,
  getExtensionsByUrl,
};
