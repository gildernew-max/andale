import { SCENE2_FLAG_KEY, isScene2Enabled, readScene2Flag } from "./flag.js";

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
  assert(readScene2Flag({ search: "", storage }) === false, "no param and no stored value is off");
  assert(isScene2Enabled({ search: "", storage }) === false, "isScene2Enabled mirrors readScene2Flag");
}

// ?scene2=1 turns it on and persists.
{
  const storage = fakeStorage();
  assert(readScene2Flag({ search: "?scene2=1", storage }) === true, "?scene2=1 turns the flag on");
  assert(storage.getItem(SCENE2_FLAG_KEY) === "1", "on persists to localStorage");
}

// ?scene2=0 turns it off and persists, even over a previously-on value.
{
  const storage = fakeStorage({ [SCENE2_FLAG_KEY]: "1" });
  assert(readScene2Flag({ search: "?scene2=0", storage }) === false, "?scene2=0 turns the flag off");
  assert(storage.getItem(SCENE2_FLAG_KEY) === "0", "off persists to localStorage");
}

console.log("scene2/flag.test.js: ok");
