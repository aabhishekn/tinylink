// Allowed characters for random code
const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

// Simple URL validation: must start with http:// or https://
function isValidUrl(url) {
  if (typeof url !== "string") return false;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }
  try {
    new URL(url); // will throw if invalid
    return true;
  } catch {
    return false;
  }
}

// Validate that code matches [A-Za-z0-9]{6,8}
function isValidCode(code) {
  if (typeof code !== "string") return false;
  const regex = /^[A-Za-z0-9]{6,8}$/;
  return regex.test(code);
}

// Generate a random 6-character shortcode
function generateRandomCode(length = 6) {
  let result = "";
  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * CODE_CHARS.length);
    result += CODE_CHARS[idx];
  }
  return result;
}

module.exports = {
  isValidUrl,
  isValidCode,
  generateRandomCode,
};
