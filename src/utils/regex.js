/**
 * Escapes characters that have special meaning in regular expressions.
 * @param {string} value - The string to escape.
 * @returns {string} The escaped string.
 */
const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

module.exports = {
  escapeRegex,
};
