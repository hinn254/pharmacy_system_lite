/**
 * Normalize Kenyan mobile numbers to international MSISDN 2547XXXXXXXX.
 * Accepts 07…, 7…, 254…, and strips non-digits.
 */
export function normalizeKenyaMsisdn(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length < 9) return null;

  let phone = digits;
  if (phone.startsWith("0")) {
    phone = `254${phone.slice(1)}`;
  } else if (phone.startsWith("7") && phone.length === 9) {
    phone = `254${phone}`;
  } else if (phone.startsWith("1") && phone.length === 9) {
    phone = `254${phone}`;
  }

  if (!phone.startsWith("254")) return null;
  if (phone.length !== 12) return null;
  if (!/^254[17]/.test(phone)) return null;

  return phone;
}
