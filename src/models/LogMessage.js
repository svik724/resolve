/**
 * Data model for a log message
 */
class LogMessage {
  constructor(timestamp, level, message, source, metadata = {}) {
    this.id = require('uuid').v4();
    this.timestamp = timestamp || new Date().toISOString();
    this.level = level; // 'debug', 'info', 'warn', 'error', 'fatal'
    this.message = message;
    this.source = source; // application/service name
    this.metadata = metadata; // additional structured data
  }

  toJSON() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      level: this.level,
      message: this.message,
      source: this.source,
      metadata: this.metadata
    };
  }

  static fromJSON(json) {
    const logMessage = new LogMessage(
      json.timestamp,
      json.level,
      json.message,
      json.source,
      json.metadata
    );
    logMessage.id = json.id;
    return logMessage;
  }
}

module.exports = LogMessage; 