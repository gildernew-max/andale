import { DOCTORAXP_FLAG_KEY, isDoctoraXpEnabled, readDoctoraXpFlag } from "./flag.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    _data: data,
  };
}

// No param, nothing stored: off by default, in every mode.
{
  const storage = fakeStorage();
  assert(readDoctoraXpFlag({ search: "", storage }) === false, "no param and no stored value is off");
  assert(isDoctoraXpEnabled({ search: "", storage }) === false, "isDoctoraXpEnabled mirrors readDoctoraXpFlag");
}

// ?doctora=1 turns it on and persists.
{
  const storage = fakeStorage();
  assert(readDoctoraXpFlag({ search: "?doctora=1", storage }) === true, "?doctora=1 turns the flag on");
  assert(storage.getItem(DOCTORAXP_FLAG_KEY) === "1", "on persists to localStorage");
}

// ?doctora=0 turns it off and persists, even over a previously-on value.
{
  const storage = fakeStorage({ [DOCTORAXP_FLAG_KEY]: "1" });
  assert(readDoctoraXpFlag({ search: "?doctora=0", storage }) === false, "?doctora=0 turns the flag off");
  assert(storage.getItem(DOCTORAXP_FLAG_KEY) === "0", "off persists to localStorage");
}

// No param on a later visit reads the persisted value.
{
  const storageOn = fakeStorage({ [DOCTORAXP_FLAG_KEY]: "1" });
  assert(readDoctoraXpFlag({ search: "", storage: storageOn }) === true, "persisted on survives without the query param");
  const storageOff = fakeStorage({ [DOCTORAXP_FLAG_KEY]: "0" });
  assert(readDoctoraXpFlag({ search: "", storage: storageOff }) === false, "persisted off survives without the query param");
}

// Other query params, or garbage values, do not flip the flag.
{
  const storage = fakeStorage({ [DOCTORAXP_FLAG_KEY]: "1" });
  assert(readDoctoraXpFlag({ search: "?date=2026-01-01", storage }) === true, "unrelated query params leave the stored flag alone");
  assert(readDoctoraXpFlag({ search: "?doctora=banana", storage }) === true, "a non-1/0 doctoraxp value falls back to the stored flag");
}

console.log("doctoraXp/flag.test.js: ok");
