/**
 * Generate unique room numbers for a given floor.
 *
 * Convention: floor 1 → 101, 102, …; floor 12 → 1201, 1202, …
 * Collision handling: if "101" is taken, try "101A", "101B", … up to "101Z".
 *
 * @param {number} floor
 * @param {number} count        – how many numbers to generate
 * @param {string[]} existing   – room numbers already present in the building
 * @returns {string[]}
 */
function generateRoomNumbers(floor, count, existing = []) {
  const taken = new Set(existing);
  const results = [];

  for (let seq = 1; results.length < count; seq++) {
    const candidate = `${floor}${String(seq).padStart(2, '0')}`;

    if (!taken.has(candidate)) {
      results.push(candidate);
      taken.add(candidate);
      continue;
    }

    for (let code = 65; code <= 90; code++) {
      const suffixed = candidate + String.fromCharCode(code);
      if (!taken.has(suffixed)) {
        results.push(suffixed);
        taken.add(suffixed);
        break;
      }
    }
  }

  return results;
}

module.exports = { generateRoomNumbers };
