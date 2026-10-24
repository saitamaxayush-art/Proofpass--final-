
import assert from 'node:assert/strict';
import { evaluateMicroCheck } from '../src/engine/step6_micro_checks.js';

const reactCheck = {
  skill: 'React',
  keywords: [
    'hook',
    'separation',
    'reusable',
    'state',
    'presentation',
    'decouple',
    'effect',
    'render',
    'props',
  ],
};

const cases = [
  {
    name: 'Long gibberish is rejected',
    answer:
      'asdf qwer zxcv asdf qwer zxcv asdf qwer zxcv asdf qwer zxcv this is a very long answer but it is nonsense blah blah blah blah',
    expected: false,
  },
  {
    name: 'Repeated words are rejected',
    answer:
      'hook hook hook hook hook hook hook hook hook hook hook hook hook hook hook hook',
    expected: false,
  },
  {
    name: 'Keyword stuffing is rejected',
    answer:
      'hook state props render state props render state props render state props render because hook state props render',
    expected: false,
  },
  {
    name: 'Off-topic answer is rejected',
    answer:
      'I enjoy playing football with my friends because it keeps me active and helps me relax after college.',
    expected: false,
  },
  {
    name: 'Relevant technical explanation passes',
    answer:
      'I use hooks to manage state because separating presentation makes components reusable and easier to test.',
    expected: true,
  },
];

for (const testCase of cases) {
  const result = evaluateMicroCheck(
    reactCheck,
    testCase.answer
  );

  assert.equal(
    result.passed,
    testCase.expected,
    `${testCase.name}: ${result.feedback}`
  );

  console.log(`PASS: ${testCase.name}`);
}
