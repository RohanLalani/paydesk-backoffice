import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

function read(path) {
  return readFileSync(join(root, path), "utf8");
}

const switchSource = read("src/components/ui/Switch.tsx");

assert.match(switchSource, /<button[\s\S]*type="button"[\s\S]*role="switch"/, "PayDeskSwitch must render a non-submit switch button.");
assert.match(switchSource, /useId\(/, "PayDeskSwitch must generate unique aria ids.");
assert.doesNotMatch(switchSource, /scrollIntoView|scrollTo|location\.hash|href="#"/, "PayDeskSwitch must not mutate scroll or hash state.");

const switchConsumers = [
  "src/components/product-setup/DepartmentsWorkspace.tsx",
  "src/components/product-setup/TaxesWorkspace.tsx",
  "src/components/product-setup/CategoriesWorkspace.tsx",
  "src/components/product-setup/PriceGroupsWorkspace.tsx",
  "src/components/products/ItemsWorkspace.tsx",
  "src/app/services/page.tsx",
  "src/app/settings/store/page.tsx",
  "src/components/stores/CreateStoreModal.tsx",
];

for (const file of switchConsumers) {
  const source = read(file);
  assert.match(source, /PayDeskSwitch/, `${file} should use the shared switch component.`);
  assert.doesNotMatch(source, /peer sr-only/, `${file} must not use hidden checkbox switches.`);
}

const departments = read("src/components/product-setup/DepartmentsWorkspace.tsx");
const departmentSwitches = [
  "Track inventory",
  "Allow negative inventory sales",
  "Allow EBT",
  "Allow manual ring-up",
  "On POS",
  "Active department",
];

for (const label of departmentSwitches) {
  assert.match(departments, new RegExp(`label="${label}"`), `Departments switch missing: ${label}`);
}

const items = read("src/components/products/ItemsWorkspace.tsx");

assert.match(items, /resetAfterSuccessfulSave/, "Items save flow must use the shared post-save reset helper.");
assert.doesNotMatch(items, /loadProduct\(saved\)/, "Items save flow must not keep the saved item loaded after success.");
assert.match(items, /successMessage: wasEditing \? "Item updated\." : "Item created\."/,
  "Create and update success messages must be preserved after reset.");
assert.match(items, /setMode\("idle"\)/, "Post-save reset must return to Lookup mode.");
assert.match(items, /setProductId\(null\)/, "Post-save reset must clear product identity.");
assert.match(items, /setProductNumber\(null\)/, "Post-save reset must clear saved product number.");
assert.match(items, /await refreshNextProductNumber\(\)/, "Post-save reset must refresh the next product number preview.");
assert.match(items, /barcode: ""/, "Post-save reset must clear barcode.");
assert.match(items, /currentQuantity: "0"/, "Post-save reset must reset current quantity.");
assert.match(items, /focus\(\{ preventScroll: true \}\)/, "Barcode focus must prevent implicit scroll jumps.");

console.log("Frontend audit passed.");
