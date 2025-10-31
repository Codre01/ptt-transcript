type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = false;
    // this.isDevelopment = __DEV__;
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: LogContext
  ): string {
    const timestamp = new Date().toISOString();
    const levelStr = level.toUpperCase().padEnd(5);
    
    let formatted = `[${timestamp}] ${levelStr} ${message}`;
    
    if (context && Object.keys(context).length > 0) {
      formatted += `\nContext: ${JSON.stringify(context, null, 2)}`;
    }
    
    return formatted;
  }

  /**
   * Log debug information (development only)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  /**
   * Log general information
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(this.formatMessage('info', message, context));
    }
  }

  /**
   * Log warnings
   */
  warn(message: string, context?: LogContext): void {
    console.warn(this.formatMessage('warn', message, context));
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext: LogContext = { ...context };
    
    if (error instanceof Error) {
      errorContext.errorMessage = error.message;
      errorContext.errorStack = error.stack;
      errorContext.errorName = error.name;
    } else if (error) {
      errorContext.error = error;
    }
    if( this.isDevelopment ) {
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  /**
   * Log state transitions (useful for debugging state machine)
   */
  stateTransition(from: string, to: string, context?: LogContext): void {
    this.debug(`State transition: ${from} → ${to}`, context);
  }

  /**
   * Log API calls
   */
  apiCall(method: string, endpoint: string, context?: LogContext): void {
    this.debug(`API Call: ${method} ${endpoint}`, context);
  }

  /**
   * Log API responses
   */
  apiResponse(endpoint: string, success: boolean, context?: LogContext): void {
    const level = success ? 'debug' : 'warn';
    const message = `API Response: ${endpoint} - ${success ? 'Success' : 'Failed'}`;
    
    if (level === 'debug') {
      this.debug(message, context);
    } else {
      this.warn(message, context);
    }
  }

  /**
   * Log performance metrics
   */
  performance(operation: string, durationMs: number, context?: LogContext): void {
    this.debug(`Performance: ${operation} took ${durationMs}ms`, context);
  }

  /**
   * Log user actions
   */
  userAction(action: string, context?: LogContext): void {
    this.info(`User Action: ${action}`, context);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export convenience functions
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logError = (message: string, error?: Error | unknown, context?: LogContext) => logger.error(message, error, context);
export const logStateTransition = (from: string, to: string, context?: LogContext) => logger.stateTransition(from, to, context);
export const logUserAction = (action: string, context?: LogContext) => logger.userAction(action, context);
