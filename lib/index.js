const path = require('path');                                        // 路径管理
const moment = require('moment');                                    // 时间格式化
const CodeAnalysis = require(path.join(__dirname, './analysis'));    // 核心分析类

const codeAnalysis = function (config) {
  return new Promise((resolve, reject)=>{
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
        reportTitle: config.reportTitle || '',
        analysisTime: moment(Date.now()).format('YYYY.MM.DD HH:mm:ss')
      };
      resolve(report);
    } catch (e) {
      reject(e);
    }
  })
};

module.exports = codeAnalysis;
