const path = require('path');                                       // 路径管理
const chalk = require('chalk');                                     // 美化输出
const ora = require('ora');                                         // 美化命令行
const CodeAnalysis = require(path.join(__dirname, './analysis'));   // 核心分析类

const codeAnalysis = function (config) {
  return new Promise((resolve, reject)=>{
    // start
    const spinner = ora(chalk.blue('analysis start')).start();
    try {
      // 新建分析实例
      const coderTask = new CodeAnalysis(config);
      // 执行代码分析
      coderTask.analysis();
      // 生成报告内容
      const report = {
        apiMap: coderTask.apiMap,
        typeMap: coderTask.typeMap,
        noUseMap: coderTask.noUseMap,
        noParseFiles: coderTask.noParseFiles,
        browserApiMap: coderTask.browserApiMap,
        scoreMap: coderTask.scoreMap
      };
      // end
      spinner.succeed(chalk.green(`==== code analysis report is in the ${coderTask.reportDir} dir ====`));
      resolve(report);
    } catch (e) {
      // end
      spinner.fail(chalk.red('analysis fail'));
      reject(e);
    }
  })
};

module.exports = codeAnalysis;
