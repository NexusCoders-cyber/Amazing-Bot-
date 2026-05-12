import chalk from "chalk";

const log = {
  info: (message) => {
    console.log(
      chalk.blue(`[ SYSTEM | ℹ️ ]: ${message}`),
    );
  },
  warn: (message) => {
    console.log(
      chalk.yellow(`[ WARNING | ⚠️ ]: ${message}`),
    );
  },
  success: (message) => {
    console.log(
      chalk.green(`[ SYSTEM | ✅ ]: ${message}`),
    );
  },
  error: (message) => {
    console.log(
      chalk.red(`[ SORRY | ❌ ]: ${message}`),
    );
  },
};

export default log;
