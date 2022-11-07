const path = require('path');                                        // 路径管理
const chalk = require('chalk');                                      // 美化输出
const moment = require('moment');                                    // 时间格式化
const ora = require('ora');                                          // 美化命令行
const CodeAnalysis = require(path.join(__dirname, './analysis'));    // 核心分析类

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
        parseErrorFiles: coderTask.parseErrorFiles,
        browserApiMap: coderTask.browserApiMap,
        scoreMap: coderTask.scoreMap,
        analysisTime: moment(Date.now()).format('YYYY.MM.DD HH:mm:ss')
      };
      // end
      spinner.succeed(chalk.green(`=== report success ===`));
      resolve(report);
    } catch (e) {
      // end
      spinner.fail(chalk.red('analysis fail'));
      reject(e);
    }
  })
};

module.exports = codeAnalysis;
