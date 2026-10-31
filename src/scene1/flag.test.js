import { SCENE1_FLAG_KEY, isScene1Enabled, readScene1Flag } from "./flag.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    _data: data,
  };
}

// No param, nothing stored: off by default.
{
  const storage = fakeStorage();
  assert(readScene1Flag({ search: "", storage }) === false, "no param and no stored value is off");
  assert(isScene1Enabled({ search: "", storage }) === false, "isScene1Enabled mirrors readScene1Flag");
}

// ?scene1=1 turns it on and persists.
{
  const storage = fakeStorage();
  assert(readScene1Flag({ search: "?scene1=1", storage }) === true, "?scene1=1 turns the flag on");
  assert(storage.getItem(SCENE1_FLAG_KEY) === "1", "on persists to localStorage");
}

// ?scene1=0 turns it off and persists, even over a previously-on value.
{
  const storage = fakeStorage({ [SCENE1_FLAG_KEY]: "1" });
  assert(readScene1Flag({ search: "?scene1=0", storage }) === false, "?scene1=0 turns the flag off");
  assert(storage.getItem(SCENE1_FLAG_KEY) === "0", "off persists to localStorage");
}

// No param on a later visit reads the persisted value.
{
  const storageOn = fakeStorage({ [SCENE1_FLAG_KEY]: "1" });
  assert(readScene1Flag({ search: "", storage: storageOn }) === true, "persisted on survives without the query param");
  const storageOff = fakeStorage({ [SCENE1_FLAG_KEY]: "0" });
  assert(readScene1Flag({ search: "", storage: storageOff }) === false, "persisted off survives without the query param");
}

// Other query params, or garbage values, do not flip the flag.
{
  const storage = fakeStorage({ [SCENE1_FLAG_KEY]: "1" });
  assert(readScene1Flag({ search: "?date=2026-01-01", storage }) === true, "unrelated query params leave the stored flag alone");
  assert(readScene1Flag({ search: "?scene1=banana", storage }) === true, "a non-1/0 scene1 value falls back to the stored flag");
}

console.log("scene1/flag.test.js: ok");
