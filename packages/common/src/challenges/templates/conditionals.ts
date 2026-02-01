import { ChallengeTemplate } from '../types';
import { ChallengeTestCase } from '../../challenge-engine';

export const fizzBuzz: ChallengeTemplate = {
  id: 'fizz-buzz',
  language: 'javascript',
  concepts: ['Iteration', 'Conditionals', 'Function'],
  difficulty: 2,
  title: 'FizzBuzz',
  prompt: 'Write a function `fizzBuzz` that returns specific strings for numbers 1 to n:\n- For multiples of 3, output "Fizz"\n- For multiples of 5, output "Buzz"\n- For multiples of both, output "FizzBuzz"\n- Otherwise output the number itself.\n\nReturn the result as an array of values.',
  starterCode: `function fizzBuzz(n) {
  // Your code here
}`,
  functionName: 'fizzBuzz',
  testFactory: (): ChallengeTestCase[] => [
    {
      id: 't1',
      name: 'FizzBuzz 15',
      input: [15],
      expectedOutput: [
        1, 2, "Fizz", 4, "Buzz", "Fizz", 7, 8, "Fizz", "Buzz", 11, "Fizz", 13, 14, "FizzBuzz"
      ],
      isHidden: false,
    },
    {
      id: 't2',
      name: 'Simple case',
      input: [3],
      expectedOutput: [1, 2, "Fizz"],
      isHidden: false,
    }
  ]
};

export const isLeapYear: ChallengeTemplate = {
  id: 'is-leap-year',
  language: 'javascript',
  concepts: ['Conditionals', 'Function'],
  difficulty: 1,
  title: 'Leap Year',
  prompt: 'Write a function `isLeapYear` that takes a year and returns true if it is a leap year, false otherwise.\n- Divisible by 4 is a leap year\n- EXCEPT divisible by 100 is NOT a leap year\n- EXCEPT divisible by 400 IS a leap year',
  starterCode: `function isLeapYear(year) {
  // Your code here
}`,
  functionName: 'isLeapYear',
  testFactory: (): ChallengeTestCase[] => [
    {
      id: 't1',
      name: '2020 (Div by 4)',
      input: [2020],
      expectedOutput: true,
      isHidden: false,
    },
    {
      id: 't2',
      name: '2021 (Not leap)',
      input: [2021],
      expectedOutput: false,
      isHidden: false,
    },
    {
      id: 't3',
      name: '1900 (Div by 100)',
      input: [1900],
      expectedOutput: false,
      isHidden: true,
    },
    {
      id: 't4',
      name: '2000 (Div by 400)',
      input: [2000],
      expectedOutput: true,
      isHidden: true,
    }
  ]
};
