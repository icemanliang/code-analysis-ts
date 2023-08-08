const path = require('path');                                                       // 路径管理
const moment = require('moment');                                                   // 时间格式化
const { REPORTTITLE, TIMEFORMAT } = require(path.join(__dirname, './constant'));    // 常量模块
const CodeAnalysis = require(path.join(__dirname, './analysis'));                   // 核心分析类

// 接收主线程发送过来的任务
process.on("message", ({task}) => {
    // console.log(task);
    try{
        // 新建分析实例
        const coderTask = new CodeAnalysis({...task.config});
        // 执行代码分析
        coderTask.analysis();
        // 生成报告内容
        const mapNames = coderTask.pluginsQueue.map(item=>item.mapName).concat(coderTask.browserQueue.map(item=>item.mapName));
        const report = {
            // importItemMap: coderTask.importItemMap,
            httpRepoMap: coderTask.httpRepoMap,
            versionMap: coderTask.versionMap,
            parseErrorInfos: coderTask.parseErrorInfos,
            scoreMap: coderTask.scoreMap,
            reportTitle: task.config.reportTitle || REPORTTITLE,
            analysisTime: moment(Date.now()).format(TIMEFORMAT),
            mapNames: mapNames
        };
        if(mapNames.length>0){
            mapNames.forEach(item => {
                report[item] = coderTask[item];
            });
        }
        const result = {
            report: report, 
            diagnosisInfos: coderTask.diagnosisInfos
        }
        // console.log(report)
        // 结束后通知主线程
        process.stdout.write(JSON.stringify({type: 'result', msg: result, taskName: task.name}), ()=>{
            process.kill(process.pid);
        })
    }catch(e){
        // console.log(e);
        // 结束后通知主线程
        process.stdout.write(JSON.stringify({type: 'result', msg:'', taskName: task.name}), ()=>{
            process.kill(process.pid);
        })
    }
});
