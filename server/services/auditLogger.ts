export interface AuditEvent {
  id: string;
  type: string;
  actor: string;
  metadata: Record<string, any>;
  timestamp: string;
}

class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 200;

  public log(type: string, actor: string, metadata: Record<string, any> = {}) {
    // Sanitize metadata: Never allow private keys, mnemonic phrases or raw auth tokens in logs
    const sanitizedMeta = { ...metadata };
    delete sanitizedMeta.privateKey;
    delete sanitizedMeta.seedPhrase;
    delete sanitizedMeta.token;
    delete sanitizedMeta.secret;

    const event: AuditEvent = {
      id: Math.random().toString(36).substring(2, 10),
      type,
      actor,
      metadata: sanitizedMeta,
      timestamp: new Date().toISOString(),
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    // Also output to console in structured format
    console.log(`[AUDIT] [${event.type}] actor=${event.actor} ${JSON.stringify(event.metadata)}`);
  }

  public getEvents(limit: number = 50): AuditEvent[] {
    return this.events.slice(0, limit);
  }
}

export const auditLogger = new AuditLogger();
