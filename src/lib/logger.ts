/**
 * Logger customizado para substituir console.log/error/warn
 * 
 * Uso:
 * import { logger } from '@/lib/logger';
 * 
 * logger.info("Dados carregados", data);
 * logger.error("Erro ao carregar", error);
 * logger.warn("Aviso importante");
 */

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LoggerConfig {
  enabled: boolean;
  minLevel: LogLevel;
  // Adicione aqui integração com Sentry, LogRocket, etc.
  // onError?: (message: string, error: Error) => void;
}

const DEFAULT_CONFIG: LoggerConfig = {
  enabled: import.meta.env.DEV, // Só funciona em desenvolvimento
  minLevel: 'debug',
};

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private config: LoggerConfig;

  constructor(config: LoggerConfig = DEFAULT_CONFIG) {
    this.config = config;
  }

  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[this.config.minLevel];
  }

  private formatMessage(level: LogLevel, ...args: any[]): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    return `${prefix} ${args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')}`;
  }

  debug(...args: any[]): void {
    if (this.shouldLog('debug')) {
      console.log(this.formatMessage('debug', ...args));
    }
  }

  info(...args: any[]): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', ...args));
    }
  }

  warn(...args: any[]): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', ...args));
    }
  }

  error(...args: any[]): void {
    if (this.shouldLog('error')) {
      console.error(this.formatMessage('error', ...args));
      
      // Aqui você pode adicionar integração com serviços de monitoramento
      // if (this.config.onError && args[0] instanceof Error) {
      //   this.config.onError(this.formatMessage('error', ...args), args[0]);
      // }
    }
  }

  // Método para criar um logger com contexto específico
  withContext(context: string): Logger {
    const contextLogger = new Logger(this.config);
    const originalMethods = {
      debug: contextLogger.debug.bind(contextLogger),
      info: contextLogger.info.bind(contextLogger),
      warn: contextLogger.warn.bind(contextLogger),
      error: contextLogger.error.bind(contextLogger),
    };

    contextLogger.debug = (...args) => originalMethods.debug(`[${context}]`, ...args);
    contextLogger.info = (...args) => originalMethods.info(`[${context}]`, ...args);
    contextLogger.warn = (...args) => originalMethods.warn(`[${context}]`, ...args);
    contextLogger.error = (...args) => originalMethods.error(`[${context}]`, ...args);

    return contextLogger;
  }
}

// Exporta uma instância singleton
export const logger = new Logger();

// Exemplo de uso com contexto:
// const authLogger = logger.withContext('Auth');
// authLogger.info("Usuário logado");
