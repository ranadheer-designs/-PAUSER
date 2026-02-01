import { ChallengeTemplate } from '../types';
import { ChallengeTestCase } from '../../challenge-engine';

export const sumRange: ChallengeTemplate = {
  id: 'sum-range',
  language: 'javascript',
  concepts: ['Iteration', 'Variable', 'Function'],
  difficulty: 2,
  title: 'Sum Range',
  prompt: 'Write a function `sumRange` that returns the sum of all integers from 1 to n (inclusive).',
  starterCode: `function sumRange(n) {
  // Your code here
}`,
  functionName: 'sumRange',
  testFactory: (): ChallengeTestCase[] => [
    {
      id: 't1',
      name: 'Sum to 5',
      input: [5],
      expectedOutput: 15,
      isHidden: false,
    },
    {
      id: 't2',
      name: 'Sum to 1',
      input: [1],
      expectedOutput: 1,
      isHidden: false,
    },
    {
      id: 't3',
      name: 'Sum to 100',
      input: [100],
      expectedOutput: 5050,
      isHidden: true,
    }
  ]
};

export const factorial: ChallengeTemplate = {
  id: 'factorial',
  language: 'javascript',
  concepts: ['Iteration', 'Recursion', 'Function'],
  difficulty: 2,
  title: 'Factorial',
  prompt: 'Write a function `factorial` that returns the factorial of n (n!). Returns 1 for n=0.',
  starterCode: `function factorial(n) {
  // Your code here
}`,
  functionName: 'factorial',
  testFactory: (): ChallengeTestCase[] => [
    {
      id: 't1',
      name: 'Factorial of 5',
      input: [5],
      expectedOutput: 120,
      isHidden: false,
    },
    {
      id: 't2',
      name: 'Factorial of 0',
      input: [0],
      expectedOutput: 1,
      isHidden: false,
    },
    {
      id: 't3',
      name: 'Factorial of 10',
      input: [10],
      expectedOutput: 3628800,
      isHidden: true,
    }
  ]
};
