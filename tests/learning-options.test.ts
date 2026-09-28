import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { characterSoundKey, learningOptions } from '../packages/contracts/src/learning-options';

const people = ['他', '她', '它', '们', '个'].map(text => ({ id: text, text, word: `${text}的词` }));

test.each(['他', '她', '它'])('listening to %s has exactly one matching sound regardless of target order', target => {
  const options = learningOptions(people, target, 'sound');
  expect(options.map(o => o.text)).toEqual([target, '们', '个']);
  expect(people).toHaveLength(5);
});

test('秘/密 are excluded as listening distractors, but meaning questions still distinguish words', () => {
  const options = [{id:'秘',text:'秘',word:'秘密'},{id:'密',text:'密',word:'密码'},{id:'人',text:'人',word:'人们'}];
  expect(learningOptions(options,'秘','sound').map(o=>o.id)).toEqual(['秘','人']);
  expect(learningOptions(options,'秘','meaning')).toEqual(options);
});

test('sound questions distinguish 香/蕉 while meaning questions deduplicate 香蕉', () => {
  const options = [{id:'香',text:'香',word:'香蕉'},{id:'蕉',text:'蕉',word:'香蕉'},{id:'人',text:'人',word:'人们'}];
  expect(learningOptions(options,'蕉','sound')).toEqual(options);
  expect(learningOptions(options,'蕉','meaning').map(o=>o.id)).toEqual(['蕉','人']);
  expect(learningOptions(options,undefined,'hunt')).toEqual(options);
});

test('an all-homophone lesson exposes a single assisted choice rather than inventing distractors', () => {
  expect(learningOptions(people.slice(0,3),'她','sound').map(o=>o.id)).toEqual(['她']);
});

test('all 1000 curriculum characters retain a meaningful, unambiguous listening choice', () => {
  const design = JSON.parse(readFileSync('课程设计/1000字课程.json','utf8'));
  let count=0;
  for(const lesson of design.lessons){
    const characters=lesson.words.map((w:{character:string;word:string})=>({id:w.character,text:w.character,word:w.word}));
    for(const target of characters){
      const options=learningOptions(characters,target.id,'sound');
      expect(options.length,`${lesson.id}/${target.text}`).toBeGreaterThanOrEqual(2);
      expect(options.filter(o=>characterSoundKey(o.text)===characterSoundKey(target.text)).map(o=>o.id)).toEqual([target.id]);
      count++;
    }
  }
  expect(count).toBe(1000);
});
