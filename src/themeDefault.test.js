import { resolveTheme } from "./themeDefault.js";

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const darkPhone = (query) => ({ matches: query === "(prefers-color-scheme: dark)" });
const lightPhone = () => ({ matches: false });

assert(resolveTheme("light", darkPhone) === "light", "saved light wins on a dark phone");
assert(resolveTheme("dark", lightPhone) === "dark", "saved dark wins on a light phone");
assert(resolveTheme(undefined, darkPhone) === "dark", "no saved theme follows a dark phone");
assert(resolveTheme(null, darkPhone) === "dark", "null saved theme follows a dark phone");
assert(resolveTheme("", darkPhone) === "dark", "empty saved theme follows a dark phone");
assert(resolveTheme("system", darkPhone) === "dark", "an unknown saved value is not a choice");
assert(resolveTheme(undefined, lightPhone) === "light", "no saved theme on a light phone stays light");
assert(resolveTheme(undefined, () => ({ matches: false })) === "light", "no preference falls back to light");
assert(resolveTheme(undefined, undefined) === "light", "missing matchMedia falls back to light");
assert(resolveTheme(undefined, null) === "light", "null matchMedia falls back to light");
assert(resolveTheme("light", undefined) === "light", "saved light does not need matchMedia");
assert(resolveTheme("dark", undefined) === "dark", "saved dark does not need matchMedia");
assert(resolveTheme(undefined, () => { throw new Error("no media"); }) === "light", "a thrown matchMedia falls back to light");
assert(resolveTheme(undefined, () => ({})) === "light", "a query without matches falls back to light");
assert(resolveTheme(undefined, () => null) === "light", "a null query result falls back to light");
assert(resolveTheme(undefined, () => ({ matches: "dark" })) === "light", "only a boolean true match is dark");
