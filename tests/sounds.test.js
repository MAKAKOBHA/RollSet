import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeSounds } from '../js/core/sounds.js';

test('строка и объект приводятся к одному виду; ambient по умолчанию зациклен', () => {
  const { sounds, problems } = normalizeSounds({ click: 'Sounds/click.mp3', ambient: { file: 'Sounds/a.ogg', volume: 0.3 } });
  assert.deepEqual(problems, []);
  assert.deepEqual(sounds.click, { file: 'Sounds/click.mp3', volume: 1, loop: false });
  assert.deepEqual(sounds.ambient, { file: 'Sounds/a.ogg', volume: 0.3, loop: true });
});

test('лишний «Assets/» и обратные слэши убираются, громкость ограничивается 0..1', () => {
  const { sounds } = normalizeSounds({ flip: { file: 'Assets\\Sounds\\flip.wav', volume: 7 } });
  assert.equal(sounds.flip.file, 'Sounds/flip.wav');
  assert.equal(sounds.flip.volume, 1);
});

test('null отключает звук; ошибки описаны понятно', () => {
  const { sounds, problems } = normalizeSounds({ click: null, boom: 'x.mp3', flip: {}, deal: 'Sounds/a.txt' });
  assert.deepEqual(sounds, {});
  assert.equal(problems.length, 3);
  assert.match(problems[0], /boom/);
});
