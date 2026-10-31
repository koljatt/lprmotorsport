// Translate only UI text and JavaScript string literals, never API keys or player data.
const english = require('./admin-english.json');
function translateAdmin(html) {
  const [markup, script] = html.split('<script>');
  if (!script) throw Error('Missing admin script');
  const phrases = Object.keys(english).sort((a, b) => b.length - a.length);
  const pattern = new RegExp(phrases.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  const translatedMarkup = markup.replace(/>[^<]+</g, text => text.replace(pattern, phrase => english[phrase]));
  const translatedScript = script.replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (literal, text) => {
    if (text === 'fi-FI') return "'en-GB'";
    return Object.hasOwn(english, text) ? JSON.stringify(english[text]) : literal;
  });
  return translatedMarkup.replace('lang="fi"', 'lang="en"') + '<script>' + translatedScript;
}
module.exports = { translateAdmin };
