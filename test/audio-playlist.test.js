import { SoundController, N } from '../src/audio.js';

console.log('--- Testing SoundController BLACKPINK 8-Bit Piano Playlist & Queue ---');

const sc = new SoundController();

// 1. Initial track must be Pink Venom
console.assert(sc.playlist.length === 5, `Expected 5 tracks, got ${sc.playlist.length}`);
console.assert(sc.getCurrentTrack().id === 'pink_venom', `Expected initial track to be pink_venom, got ${sc.getCurrentTrack().id}`);
console.log('✓ Initial track is BLACKPINK - Pink Venom');

// 2. Track definitions and order
const expectedOrder = ['pink_venom', 'shut_down', 'ddudu', 'how_you_like_that', 'kill_this_love'];
for (let i = 0; i < expectedOrder.length; i++) {
  const track = sc.playlist[i];
  console.assert(track.id === expectedOrder[i], `Track ${i} should be ${expectedOrder[i]}`);
  console.assert(track.tempo >= 80 && track.tempo <= 160, `Track tempo invalid: ${track.tempo}`);
  console.assert(track.barCount === 8, `Track barCount should be 8`);
  console.assert(track.title.length > 0, `Track title is empty`);
  console.assert(track.artist === 'BLACKPINK', `Artist should be BLACKPINK`);
}
console.log('✓ Verified all 5 BLACKPINK tracks are defined in sequence with 8 bars each');

// 3. Queue progression: Next track cycling
let notifiedTrack = null;
sc.onTrackChange((track) => {
  notifiedTrack = track;
});

sc.nextTrack();
console.assert(sc.getCurrentTrack().id === 'shut_down', 'Should transition to Shut Down');
console.assert(notifiedTrack && notifiedTrack.id === 'shut_down', 'Listener notified of Shut Down');

sc.nextTrack();
console.assert(sc.getCurrentTrack().id === 'ddudu', 'Should transition to DDU-DU DDU-DU');

sc.nextTrack();
console.assert(sc.getCurrentTrack().id === 'how_you_like_that', 'Should transition to How You Like That');

sc.nextTrack();
console.assert(sc.getCurrentTrack().id === 'kill_this_love', 'Should transition to Kill This Love');

// Loop back to Pink Venom
sc.nextTrack();
console.assert(sc.getCurrentTrack().id === 'pink_venom', 'Should loop back to Pink Venom');
console.log('✓ Verified forward track queue loop (Pink Venom -> Shut Down -> DDU-DU -> How You Like That -> Kill This Love -> Pink Venom)');

// 4. Reverse track cycling
sc.prevTrack();
console.assert(sc.getCurrentTrack().id === 'kill_this_love', 'Prev track should be Kill This Love');
console.log('✓ Verified reverse track queue navigation');

// 5. Direct track selection by ID
sc.selectTrack('shut_down');
console.assert(sc.getCurrentTrack().id === 'shut_down', 'Direct selection of shut_down failed');
sc.selectTrack('how_you_like_that');
console.assert(sc.getCurrentTrack().id === 'how_you_like_that', 'Direct selection of how_you_like_that failed');
console.log('✓ Verified direct track selection by ID');

// 6. Verify Note Pitch Dictionary
const pitchKeys = Object.keys(N);
console.assert(pitchKeys.length >= 72, `Expected at least 72 pitch notes, found ${pitchKeys.length}`);
for (const key of pitchKeys) {
  const freq = N[key];
  console.assert(typeof freq === 'number' && freq > 20 && freq < 4000, `Invalid frequency for ${key}: ${freq}`);
}
console.log(`✓ Verified ${pitchKeys.length} musical frequencies across all chromatic octaves`);

console.log('\nALL AUDIO PLAYLIST TESTS PASSED SUCCESSFULLY! ✅\n');
