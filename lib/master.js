const ora = require('ora');                                  // 命令行状态
const chalk = require('chalk');                              // 美化输出
const { fork } = require('child_process');                   // 子进程
const path = require('path');                                // 路径管理

const childFile = './worker.js';                             // 子进程文件
const workerNum = 8;                                         // 最高并行数
let completedCount = 0;                                      // 已完成子进程数
let totalCount = 0;                                          // 总任务数
let allTasksStartTime = 0;                                   // 主进程起始分析时间         
let tasks = [];                                              // 多进程任务信息
let resolveHandler = null;

// 创建子进程
function forkWorker(task) {
    task.status = 'doing';
    const worker = fork(path.join(__dirname, childFile), {
        silent: true
    });
    let data = '';
    let childStartTime = Date.now();
    console.log('\nworker id : ' + worker.pid + ' create for ' + task.name)
    worker.stdout.setEncoding('utf8');
    worker.stdout.on('data', function (chunk) {
        data += chunk;       
    });
    worker.stdout.on('end', function() {
        const { type, msg, taskName } = JSON.parse(data);
        if(type ==='result'){
            const doneTask = tasks.find((item)=>{
                return item.name === taskName;
            })
            if(doneTask){
                doneTask.result = msg;
                doneTask.status = 'done';
                completedCount++;
                // 完成一个，记录并打印进度
                console.log(`\nanalysis process: ${completedCount}/${totalCount}`);
            }
        }
    })
    // 子进程结束事件
    worker.on('exit', function(code){
        console.log('\nworker id : ' + this.pid + ' deal done & exit, ' + ' 用时: ' + (Date.now() - childStartTime)/1000 + 's');
        const todoTask = tasks.find((item)=>{
            return item.status === 'todo';
        })
        if(todoTask){
            forkWorker(todoTask)
        }
        if (completedCount >= totalCount) {
            // console.log(tasks);
            console.info(`\nall tasks success, 用时: ${(Date.now() - allTasksStartTime)/1000}s`);
            done();
        }
    })
    worker.send({task:task})
}

// 合并分析结果
function done() {
    // console.log(tasks);
    const computedTasks = tasks.map((item)=>{
        if(item.status === 'done'){
            return item.result
        } 
    })
    let report = {};
    // 合并 diagnosisInfos, parseErrorInfos
    let diagnosisInfos = [];
    let parseErrorInfos = [];
    computedTasks.forEach((item)=>{
        diagnosisInfos = diagnosisInfos.concat(item.diagnosisInfos);
        parseErrorInfos = parseErrorInfos.concat(item.report.parseErrorInfos);
    })    
    report.parseErrorInfos = parseErrorInfos;
    // 合并 scoreMap
    let suggestMessage = [];
    computedTasks.forEach((item)=>{
        if(item.report.scoreMap && item.report.scoreMap.message.length>0){
            suggestMessage = suggestMessage.concat(item.report.scoreMap.message);
        }
    })
    report.scoreMap = {
        score: 100,
        message: [...new Set(suggestMessage)]
    }
    // 合并 httpRepoMap
    let httpRepoMap = {}
    computedTasks.forEach((item)=>{
        if(item.report.httpRepoMap && Object.keys(item.report.httpRepoMap).length>0){
            httpRepoMap = {...item.report.httpRepoMap, ...httpRepoMap}
        }
    })
    report.httpRepoMap = httpRepoMap;
    // 合并 versionMap
    let versionMap = {}
    computedTasks.forEach((item)=>{
        if(item.report.versionMap && Object.keys(item.report.versionMap).length>0){
            Object.keys(item.report.versionMap).forEach((vitem)=>{
                if(!versionMap[vitem]){
                    versionMap[vitem] = {}
                    versionMap[vitem].cN = item.report.versionMap[vitem].cN;
                    versionMap[vitem].cS = item.report.versionMap[vitem].cS;
                }else{
                    versionMap[vitem].cN += item.report.versionMap[vitem].cN;
                    versionMap[vitem].cS = versionMap[vitem].cS.concat(item.report.versionMap[vitem].cS);
                }
            })
        }
    })
    report.versionMap = versionMap;
    // 合并插件Map
    report.mapNames = computedTasks[0].report.mapNames;
    report.mapNames.forEach((item)=>{
        report[item] = {};
        computedTasks.forEach((citem)=>{
            if(citem.report[item] && Object.keys(citem.report[item]).length>0){
                Object.keys(citem.report[item]).forEach((vitem)=>{
                    if(!report[item][vitem]){
                        report[item][vitem] = {}
                        report[item][vitem].cN = citem.report[item][vitem].cN;
                        report[item][vitem].as = citem.report[item][vitem].as;
                        if(citem.report[item][vitem].isTag){
                            report[item][vitem].isTag = citem.report[item][vitem].isTag;
                        }
                        report[item][vitem].cF = citem.report[item][vitem].cF;
                    }else{
                        report[item][vitem].cN += citem.report[item][vitem].cN;
                        report[item][vitem].cF = {...report[item][vitem].cF, ...citem.report[item][vitem].cF}
                    }
                })
            }
        })
    })
    // 补全字段
    report.reportTitle = '代码分析报告';
    report.analysisTime = new Date();
    
    console.log(chalk.green('\nanalysis success'));
    resolveHandler({
        report: report,
        diagnosisInfos: diagnosisInfos
    });
}  

const codeAnalysis = function (config) {
    return new Promise((resolve, reject) => {
        resolveHandler = resolve;
        allTasksStartTime = Date.now()
        console.log(chalk.green('\nanalysis start'));
        try {
            // 记录开始时间
            startTime = Date.now();
            // 任务总数
            totalCount = config.scanSource.length;
            // 任务对象
            tasks = config.scanSource.map((item)=>{
                return {
                    ...item,
                    config: {
                        ...config,
                        scanSource: [item],
                    },
                    result: '', 
                    status: 'todo'
                }
            })
            // 初始化worker数目
            const formNum = totalCount > workerNum ? workerNum : totalCount;
            // 创建首批worker
            for (let i = 0; i < formNum; i++) {
                forkWorker(tasks[i])
            }
            return {};
        } catch (e) {
            reject(e);
            console.log(chalk.green('\nanalysis fail'));
        }
    })
}

module.exports = codeAnalysis;
