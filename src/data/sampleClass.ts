import type { Klass } from '../types';
import { uid } from '../lib/ids';

const SAMPLE_NAMES = [
  'Ada Lovelace', 'Alan Turing', 'Grace Hopper', 'Linus Torvalds',
  'Margaret Hamilton', 'Tim Berners-Lee', 'Katherine Johnson',
  'Donald Knuth', 'Barbara Liskov', 'Hedy Lamarr', 'Claude Shannon',
  'Radia Perlman',
];

export function makeSampleClass(): Klass {
  return {
    id: uid('cls_'),
    name: 'Sample Class',
    students: SAMPLE_NAMES.map((name) => ({ id: uid('stu_'), name })),
    defaultTimerSeconds: 30,
    createdAt: Date.now(),
  };
}
