const path = require('path');                                                       // 路径管理
const moment = require('moment');                                                   // 时间格式化
const { REPORTTITLE, TIMEFORMAT } = require(path.join(__dirname, './constant'));    // 常量模块
const CodeAnalysis = require(path.join(__dirname, './analysis'));                   // 核心分析类

const codeAnalysis = function (config) {
  return new Promise((resolve, reject)=>{
    try {
      // 新建分析实例
      const coderTask = new CodeAnalysis(config);
      // 执行代码分析
      coderTask.analysis();
      // 生成报告内容
      const mapNames = coderTask.pluginsQueue.map(item=>item.mapName).concat(coderTask.browserQueue.map(item=>item.mapName));
      const report = {
        importItemMap: coderTask.importItemMap,
        parseErrorInfos: coderTask.parseErrorInfos,
        scoreMap: coderTask.scoreMap,
        reportTitle: config.reportTitle || REPORTTITLE,
        analysisTime: moment(Date.now()).format(TIMEFORMAT),
        mapNames: mapNames
      };
      if(mapNames.length>0){
        mapNames.forEach(item => {
          report[item] = coderTask[item];
        });
      }
      resolve({
        report: report, 
        diagnosisInfos: coderTask.diagnosisInfos
      });
    } catch (e) {
      reject(e);
    }
  })
};

module.exports = codeAnalysis;
