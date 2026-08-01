const levelColors = {
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const reset = '\x1b[0m';

function log(level, message, meta) {
  const timestamp = new Date().toISOString();
  const color = levelColors[level] || '';
  const prefix = `${color}[${timestamp}] [${level.toUpperCase()}]${reset}`;

  if (meta !== undefined) {
    console.log(prefix, message, meta);
  } else {
    console.log(prefix, message);
  }
}

const logger = {
  info: (message, meta) => log('info', message, meta),
  warn: (message, meta) => log('warn', message, meta),
  error: (message, meta) => log('error', message, meta),
};

module.exports = logger;
