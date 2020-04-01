const secondaryCancerConditionVS = require('./valueSets/ValueSet-onco-core-SecondaryCancerDisorderVS.json');

const checkCodeInVS = (code, valueSet) => {
  // strips the period in the code since the provided value set has the periods removed
  return valueSet.compose.include[2].concept.map((c) => c.code).includes(code.replace('.', ''));
};

/**
 * Checks for ICD-10 code
 * @param {object} condition fhir resource
 * @return {code} if condition has an ICD10 code
 */
const getICD10Code = (condition) => {
  if (condition && condition.code) {
    const {coding} = condition.code;

    if (coding && coding.length > 0) {
      return coding.find((c) => c.system === 'http://hl7.org/fhir/sid/icd-10-cm');
    }
  }
  return undefined;
};


// Checks if condition's ICD10 code is in valueset
const checkConditionInVS = (condition, vs) => {
  const icd10Code = getICD10Code(condition);
  return icd10Code && checkCodeInVS(icd10Code.code, vs);
};

/**
 * Checks if a condition resource is a primary cancer condition
 * @param {object} condition fhir resource
 * @return {string} primary or secondary
 */
const getCancerType = (condition) => {
  return checkConditionInVS(condition, secondaryCancerConditionVS) ? 'secondary' : 'primary';
};

module.exports = {
  getCancerType,
  getICD10Code,
};
