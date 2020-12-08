const secondaryCancerConditionVS = require('./valueSets/ValueSet-mcode-secondary-cancer-disorder-vs.json');

/**
 * Check if condition is in value set
 * @param {object} condition fhir resource
 * @param {object} valueSet contains list of codes included in value set
 * @return {boolean} true if condition is in valueSet
 */
const checkCodeInVS = (condition, valueSet) => {
  if (!condition.code || !condition.code.coding) return false;
  const coding = condition.code.coding;

  // If valueSet has expansion, we only need to check these codes since everything in compose is in expansion
  if (valueSet.expansion) {
    return coding.some((c) => {
      return valueSet.expansion.contains.some((containsItem) => {
        if (!c || !containsItem) return false;
        return c.system === containsItem.system && c.code === containsItem.code;
      });
    });
  }

  // Checks if code is in any of the valueSet.compose.include arrays
  return coding.some((c) => {
    return valueSet.compose.include.some((includeItem) => {
      if (!c || !includeItem || !includeItem.concept) return false;
      return c.system === includeItem.system &&
        includeItem.concept.map((concept) => concept.code).includes(c.code);
    });
  });
};

/**
 * Checks if a condition resource is a primary cancer condition
 * @param {object} condition fhir resource
 * @return {string} primary or secondary
 */
const getCancerType = (condition) => {
  return checkCodeInVS(condition, secondaryCancerConditionVS) ? 'secondary' : 'primary';
};

module.exports = {
  getCancerType,
};
