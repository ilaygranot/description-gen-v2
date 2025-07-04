/**
 * Logger utility for structured console output
 * Provides clear, formatted logging for debugging and monitoring
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  // Text colors
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  
  // Background colors
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m'
};

class Logger {
  constructor(prefix = '') {
    this.prefix = prefix;
  }

  /**
   * Format timestamp for log entries
   */
  getTimestamp() {
    return new Date().toISOString().replace('T', ' ').slice(0, -5);
  }

  /**
   * Log informational messages
   */
  info(message, data = null) {
    const timestamp = this.getTimestamp();
    console.log(`${colors.blue}[INFO]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${this.prefix}${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Log success messages
   */
  success(message, data = null) {
    const timestamp = this.getTimestamp();
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${this.prefix}${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Log warning messages
   */
  warn(message, data = null) {
    const timestamp = this.getTimestamp();
    console.log(`${colors.yellow}[WARN]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${this.prefix}${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  /**
   * Log error messages
   */
  error(message, error = null) {
    const timestamp = this.getTimestamp();
    console.log(`${colors.red}[ERROR]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${this.prefix}${message}`);
    if (error) {
      console.log(error.stack || error.message || error);
    }
  }

  /**
   * Log API requests
   */
  api(method, endpoint, data = null) {
    const timestamp = this.getTimestamp();
    console.log(`${colors.cyan}[API]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${method} ${endpoint}`);
    if (data) {
      console.log('Request Data:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Log processing steps
   */
  process(step, details = null) {
    const timestamp = this.getTimestamp();
    console.log(`${colors.magenta}[PROCESS]${colors.reset} ${colors.dim}${timestamp}${colors.reset} ${step}`);
    if (details) {
      console.log('Details:', JSON.stringify(details, null, 2));
    }
  }

  /**
   * Create a child logger with additional prefix
   */
  child(additionalPrefix) {
    return new Logger(`${this.prefix}${additionalPrefix} > `);
  }

  /**
   * Log a separator line for clarity
   */
  separator() {
    console.log(`${colors.dim}${'─'.repeat(80)}${colors.reset}`);
  }

  /**
   * Log a header section
   */
  header(title) {
    this.separator();
    console.log(`${colors.bright}${colors.blue}${title.toUpperCase()}${colors.reset}`);
    this.separator();
  }
}

// Export singleton instance for general use
const logger = new Logger();

module.exports = { Logger, logger }; 