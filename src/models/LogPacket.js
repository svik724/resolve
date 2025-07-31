const LogMessage = require('./LogMessage');

/**
 * Data model for a log packet containing multiple log messages
 */
class LogPacket {
  constructor(emitterId, messages = [], metadata = {}) {
    this.id = require('uuid').v4();
    this.emitterId = emitterId; // identifier for the log emitter
    this.timestamp = new Date().toISOString();
    this.messages = messages.map(msg => 
      msg instanceof LogMessage ? msg : LogMessage.fromJSON(msg)
    );
    this.metadata = metadata; // packet-level metadata
    this.size = this.messages.length;
  }

  addMessage(message) {
    if (message instanceof LogMessage) {
      this.messages.push(message);
    } else {
      this.messages.push(LogMessage.fromJSON(message));
    }
    this.size = this.messages.length;
  }

  getMessageCount() {
    return this.messages.length;
  }

  toJSON() {
    return {
      id: this.id,
      emitterId: this.emitterId,
      timestamp: this.timestamp,
      messages: this.messages.map(msg => msg.toJSON()),
      metadata: this.metadata,
      size: this.size
    };
  }

  static fromJSON(json) {
    const packet = new LogPacket(
      json.emitterId,
      json.messages,
      json.metadata
    );
    packet.id = json.id;
    packet.timestamp = json.timestamp;
    return packet;
  }
}

module.exports = LogPacket; 