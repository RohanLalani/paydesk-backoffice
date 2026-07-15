export type BarcodeValidationResult =
  | { ok: true; barcode: string }
  | { ok: false; message: string };

export function validateBarcodeInput(value: string): BarcodeValidationResult {
  const barcode = value.replace(/[\r\n\t]+$/g, "").trim();

  if (!barcode) {
    return { ok: false, message: "Enter a barcode." };
  }

  if (barcode.length > 64) {
    return { ok: false, message: "Barcode must be 64 characters or fewer." };
  }

  if (/\s/.test(barcode)) {
    return { ok: false, message: "Barcode cannot contain spaces." };
  }

  if (!/^[\x21-\x7e]+$/.test(barcode)) {
    return { ok: false, message: "Barcode contains unsupported characters." };
  }

  if (/^\d+$/.test(barcode) && [8, 12, 13].includes(barcode.length) && !hasValidGtinCheckDigit(barcode)) {
    return { ok: false, message: "Barcode has an invalid UPC/EAN check digit." };
  }

  return { ok: true, barcode };
}

function hasValidGtinCheckDigit(barcode: string) {
  const digits = [...barcode].map((digit) => Number(digit));
  const checkDigit = digits.at(-1);
  const body = digits.slice(0, -1);
  const sum = body
    .slice()
    .reverse()
    .reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 3 : 1), 0);
  const expected = (10 - (sum % 10)) % 10;

  return checkDigit === expected;
}
