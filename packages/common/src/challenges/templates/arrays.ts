import { ChallengeTemplate } from '../types';
import { ChallengeTestCase } from '../../challenge-engine';

export const doubleArray: ChallengeTemplate = {
  id: 'double-array',
  language: 'javascript',
  concepts: ['Array', 'Function', 'Iteration'],
  difficulty: 1,
  title: 'Double the Numbers',
  prompt: 'Write a function `doubleArray` that takes an array of numbers and returns a new array with each number doubled.',
  starterCode: `function doubleArray(numbers) {
  // Your code here
}`,
  functionName: 'doubleArray',
  testFactory: (): ChallengeTestCase[] => [
    {
      id: 't1',
      name: 'Simple case',
      input: [[1, 2, 3]],
      expectedOutput: [2, 4, 6],
      isHidden: false,
    },
    {
      id: 't2',
      name: 'Empty array',
      input: [[]],
      expectedOutput: [],
      isHidden: false,
    },
    {
      id: 't3',
      name: 'Negative numbers',
      input: [[-1, -5, 0]],
      expectedOutput: [-2, -10, 0],
      isHidden: true,
    }
  ]
};

export const filterEven: ChallengeTemplate = {
  id: 'filter-even',
  language: 'javascript',
  concepts: ['Array', 'Function', 'Conditionals'],
  difficulty: 1,
  title: 'Filter Even Numbers',
  prompt: 'Write a function `filterEven` that takes an array of numbers and returns only the even numbers.',
  starterCode: `function filterEven(numbers) {
  // Your code here
}`,
  functionName: 'filterEven',
  testFactory: (): ChallengeTestCase[] => [
    {
      id: 't1',
      name: 'Mixed numbers',
      input: [[1, 2, 3, 4, 5, 6]],
      expectedOutput: [2, 4, 6],
      isHidden: false,
    },
    {
      id: 't2',
      name: 'No even numbers',
      input: [[1, 3, 5]],
      expectedOutput: [],
      isHidden: true,
    }
  ]
};
