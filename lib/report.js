const fs =require('fs');                                                            //文件操作
const path =require('path');                                                        //路径操作
const { writeJsFile, writeJsonFile } =require(path.join(__dirname, './file'));

// 输出分析报告
exports.writeReport = function (reportDir, report){
    try{
        // 创建目录
        fs.mkdirSync(path.join(process.cwd(),`/${reportDir}`),0777);
        // 复制文件
        fs.writeFileSync(path.join(process.cwd(), `/${reportDir}/jquery.min.js`), fs.readFileSync(path.join(__dirname, '../template/jquery.min.js')));
        fs.writeFileSync(path.join(process.cwd(), `/${reportDir}/index.html`), fs.readFileSync(path.join(__dirname, '../template/report.html')));
        // 分析结果写入文件
        writeJsFile('var report=', report, `${reportDir}/report`); 
        writeJsonFile(report, `${reportDir}/report`);
    }catch(e){
        throw e;
    }
}