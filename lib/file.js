const fs =require('fs');                            //文件操作
const path =require('path');                        //路径操作
const glob = require('glob');                       //扫描文件

// 将结果输出到json文件
const writeJsonFile =function (str, fileName) {
    try{
        fs.writeFileSync(path.join(process.cwd(),`${fileName}.json`), JSON.stringify(str), 'utf8');
    }catch(e){
        throw e;
    }
}
// 将结果输出到js文件
const writeJsFile =function(prc, str, fileName) {
    try{
        fs.writeFileSync(path.join(process.cwd(),`${fileName}.js`), prc+JSON.stringify(str), 'utf8');
    }catch(e){
        throw e;
    }
}
// 扫描目标文件ts
exports.scanFileTs = function(scanPath) {
    const tsFiles = glob.sync(path.join(process.cwd(), `${scanPath}/**/*.ts`));
    const tsxFiles = glob.sync(path.join(process.cwd(), `${scanPath}/**/*.tsx`));
    // console.log(tsFiles);
    // console.log(tsxFiles);
    return tsFiles.concat(tsxFiles);
}
// 扫描目标文件vue
exports.scanFileVue = function(scanPath) {
    const entryFiles = glob.sync(path.join(process.cwd(), `${scanPath}/**/*.vue`));
    // console.log(entryFiles);
    return entryFiles;
}
// 获取文件代码内容
exports.getCode = function(fileName) {
    const code = fs.readFileSync(fileName, 'utf-8');
    // console.log(code);
    return code;
}
// 输出分析报告
exports.writeReport = function (reportDir, report){
    try{
        // 创建目录
        fs.mkdirSync(path.join(process.cwd(),`/${reportDir}`),0777);
        // 复制文件
        fs.writeFileSync(path.join(process.cwd(), `/${reportDir}/jquery.min.js`), fs.readFileSync(path.join(__dirname, '../report/jquery.min.js')));
        fs.writeFileSync(path.join(process.cwd(), `/${reportDir}/index.html`), fs.readFileSync(path.join(__dirname, '../report/report.html')));
        // 分析结果写入文件
        writeJsFile('var report=', report, `${reportDir}/report`); 
        writeJsonFile(report, `${reportDir}/report`);
    }catch(e){
        throw e;
    }
}
