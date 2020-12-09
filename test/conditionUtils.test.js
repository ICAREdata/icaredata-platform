const rewire = require('rewire');
const {expect} = require('chai');
const conditionUtils = rewire('../utils/conditionUtils');
const exampleSecondaryCondition = require('./fixtures/conditionUtils/exampleSecondaryCondition.json');
const secondaryCancerConditionVS = require('../utils/valueSets/ValueSet-mcode-secondary-cancer-disorder-vs.json');

describe('Condition Utility', () => {
  describe('getCancerType', () => {
    const {getCancerType} = conditionUtils;
    it('Should return secondary', () => {
      const cancerType = getCancerType(exampleSecondaryCondition);
      expect(cancerType).to.equal('secondary');
    });

    // Hacky: Any condition that is not secondary is primary
    // Rob mentioned that it should be one or the other so only the secondary cancer condition value set is included
    it('Should return primary', () => {
      const cancerType = getCancerType({});
      expect(cancerType).to.equal('primary');
    });
  });

  const checkCodeInVS = conditionUtils.__get__('checkCodeInVS');
  describe('checkCodeInVS', () => {
    const exampleIcdCondition = {
      code: {
        coding: [
          {
            system: 'http://hl7.org/fhir/sid/icd-10-cm',
            code: 'C79.81',
          },
        ],
      },
    };

    const exampleConditionWithBadCode = {
      code: {
        coding: [
          {
            system: 'http://hl7.org/fhir/sid/icd-10-cm',
            code: 'abc',
          },
        ],
      },
    };

    const exampleConditionWithBadSystem = {
      code: {
        coding: [
          {
            system: 'wrong-system',
            code: 'C79.81',
          },
        ],
      },
    };

    it('should return true with icd-10 code in value set', () => {
      const response = checkCodeInVS(exampleIcdCondition, secondaryCancerConditionVS);
      expect(response).to.be.true;
    });

    it('should return false with code not in value set', () => {
      const response = checkCodeInVS(exampleConditionWithBadCode, secondaryCancerConditionVS);
      expect(response).to.be.false;
    });

    it('should return false with wrong system', () => {
      const response = checkCodeInVS(exampleConditionWithBadSystem, secondaryCancerConditionVS);
      expect(response).to.be.false;
    });

    it('should check valueSet.compose if expansion not in valueSet', () => {
      const valueSetWithoutExpansion = {...secondaryCancerConditionVS};
      delete valueSetWithoutExpansion.expansion;

      // Snomed codes are only included in value set with expansion
      expect(checkCodeInVS(exampleIcdCondition, valueSetWithoutExpansion)).to.be.true;
      expect(checkCodeInVS(exampleConditionWithBadCode, valueSetWithoutExpansion)).to.be.false;
      expect(checkCodeInVS(exampleConditionWithBadSystem, valueSetWithoutExpansion)).to.be.false;
    });
  });
});
