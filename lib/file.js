const fs = require('fs');                            // 文件操作
const path = require('path');                        // 路径操作
const glob = require('glob');                        // 扫描文件

// 输出内容到JSON文件
exports.writeJsonFile = function (content, fileName) {
    try{
        fs.writeFileSync(path.join(process.cwd(),`${fileName}.json`), JSON.stringify(content), 'utf8');
    }catch(e){
        throw e;
    }
}
// 输出内容到JS文件
exports.writeJsFile = function(prc, content, fileName) {
    try{
        fs.writeFileSync(path.join(process.cwd(),`${fileName}.js`), prc+JSON.stringify(content), 'utf8');
    }catch(e){
        throw e;
    }
}
// 输出TS片段到TS文件
exports.writeTsFile = function(content, fileName) {
    try{
        fs.writeFileSync(path.join(process.cwd(),`${fileName}.ts`), content, 'utf8');
    }catch(e){
        throw e;
    }
}
// 扫描TS文件
exports.scanFileTs = function(scanPath) {
    const tsFiles = glob.sync(path.join(process.cwd(), `${scanPath}/**/*.ts`));
    const tsxFiles = glob.sync(path.join(process.cwd(), `${scanPath}/**/*.tsx`));
    // console.log(tsFiles);
    // console.log(tsxFiles);
    return tsFiles.concat(tsxFiles);
}
// 扫描VUE文件
exports.scanFileVue = function(scanPath) {
    const entryFiles = glob.sync(path.join(process.cwd(), `${scanPath}/**/*.vue`));
    // console.log(entryFiles);
    return entryFiles;
}
// 获取代码文件内容
exports.getCode = function(fileName) {
    try{
        const code = fs.readFileSync(fileName, 'utf-8');
        // console.log(code);
        return code;
    }catch(e){
        throw e;
    }
}
// 获取Json文件内容
exports.getJsonContent = function(fileName) {
    try{
        const content = JSON.parse(fs.readFileSync(`${path.join(process.cwd(), fileName)}`, 'utf-8'));
        // console.log(content);
        return content;
    }catch(e){
        throw e;
    }
}
// 创建目录
exports.mkDir = function(dirName) {
    try{
        fs.mkdirSync(path.join(process.cwd(),`/${dirName}`),0777);
    }catch(e){
        throw e;
    }
}
// 删除指定目录及目录下所有文件
exports.rmDir = function(dirName) {
    try{
        const dirPath =path.join(process.cwd(),`./${dirName}`);
        if( fs.existsSync(dirPath) ) {                                      // 判断给定的路径是否存在
            const files = fs.readdirSync(dirPath);                          // 返回文件和子目录的数组
            files.forEach(function(file){
                var curPath = path.join(dirPath, file);
                    
                if(fs.statSync(curPath).isDirectory()) {                    // 如果是文件夹，则继续
                    rmDir(curPath);
                } else {    
                    fs.unlinkSync(curPath);                                 // 如果是文件，则删除
                }
                    
            });
            fs.rmdirSync(dirPath);                                          // 清除文件夹
        }
    }catch(e){
        throw e;
    }
}
