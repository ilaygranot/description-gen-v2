const fs = require('fs');
const path = require('path');

/**
 * Simple template loader & renderer for prompt files.
 * Supports:
 *   • {{variable}}           – straight replacement
 *   • {{#variable}} ... {{/variable}} – conditional block (rendered only if value is truthy)
 */
class Prompt {
  static cache = new Map();

  static load(fileName) {
    if (Prompt.cache.has(fileName)) {
      return Prompt.cache.get(fileName);
    }
    const filePath = path.join(__dirname, '..', 'prompts', fileName);
    const content = fs.readFileSync(filePath, 'utf8');
    Prompt.cache.set(fileName, content);
    return content;
  }

  /**
   * Render a prompt template
   * @param {string} fileName  – template file name under /prompts
   * @param {object} data      – key/value pairs for replacements
   */
  static render(fileName, data = {}) {
    let tpl = Prompt.load(fileName);

    // Conditional sections {{#var}} ... {{/var}}
    tpl = tpl.replace(/{{#(\w+)}}([\s\S]*?){{\/\1}}/g, (m, varName, inner) => {
      const val = data[varName];
      return val ? inner : '';
    });

    // Simple {{var}} replacements
    tpl = tpl.replace(/{{(\w+)}}/g, (m, varName) => {
      const val = data[varName];
      return (val !== undefined && val !== null) ? val : '';
    });

    return tpl;
  }
}

module.exports = Prompt; 