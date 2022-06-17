const fhirpath = require('fhirpath');

// Utility function to get the resources of a type from our message bundle
// Optionally get only the first resource of that type via 'first' parameter
const getBundleResourcesByType = (
  message,
  type,
  context = {},
  first = false
) => {
  const resources = fhirpath.evaluate(
    message,
    `Bundle.entry.where(resource.resourceType='${type}').resource`,
    context
  );

  if (resources.length > 0) {
    return first ? resources[0] : resources;
  } else {
    return first ? null : [];
  }
};

// Utility function to get the extensions on an array of extension by url
// Optionally get only the first extension of that url via 'first' parameter
const getExtensionsByUrl = (extArr, url, first = false) => {
  const extensions = extArr ? extArr.filter((e) => e.url === url) : [];

  if (extensions.length > 0) {
    return first ? extensions[0] : extensions;
  } else {
    return first ? null : [];
  }
};

// Utility function to return a boolean indicating whether a given resource id
// matches the given reference id
const doResourceAndReferenceIdsMatch = (resource, reference) => {
  if (reference.startsWith('urn:uuid:')) {
    const referenceId = reference.split(':')[2];
    return (
      resource.id === referenceId ||
      (resource.identifier &&
        resource.identifier.some((id) => id.value === referenceId))
    );
  } else if (reference.includes('/')) {
    const referenceId = reference.split('/')[1];
    return (
      resource.id === referenceId ||
      (resource.identifier &&
        resource.identifier.some((id) => id.value === referenceId))
    );
  } else {
    return false;
  }
};

module.exports = {
  getBundleResourcesByType,
  getExtensionsByUrl,
  doResourceAndReferenceIdsMatch,
};
