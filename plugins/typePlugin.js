exports.typePlugin = function (CodeAnalysisObj) {
    // 副作用
    CodeAnalysisObj.typeMap = {};

    function findType (node, depth, filepath, projectName, httpRepo, line) {
        try{
            if (node.typeName && node.typeName.escapedText && node.typeName.escapedText == element.name) {
                // console.log(node.typeName.escapedText);
                if (!that.typeMap[element.name]) {
                    that.typeMap[element.name] = {};
                    that.typeMap[element.name].callNum = 1;
                    that.typeMap[element.name].callOrigin = element.origin;
                    that.typeMap[element.name].callFiles = {};
                    that.typeMap[element.name].callFiles[filepath] = {};
                    that.typeMap[element.name].callFiles[filepath].projectName = projectName;
                    that.typeMap[element.name].callFiles[filepath].httpRepo = httpRepo;
                    that.typeMap[element.name].callFiles[filepath].lines = [];
                    that.typeMap[element.name].callFiles[filepath].lines.push(line);
                } else {
                    that.typeMap[element.name].callNum++;
                    if (!Object.keys(that.typeMap[element.name].callFiles).includes(filepath)) {
                        that.typeMap[element.name].callFiles[filepath] = {};
                        that.typeMap[element.name].callFiles[filepath].projectName = projectName;
                        that.typeMap[element.name].callFiles[filepath].httpRepo = httpRepo;
                        that.typeMap[element.name].callFiles[filepath].lines = [];
                        that.typeMap[element.name].callFiles[filepath].lines.push(line);
                    }else{
                        that.typeMap[element.name].callFiles[filepath].lines.push(line);
                    }
                }
            }
        }catch(e){
            console.log(e);
        }
    }
    // 返回分析node节点的纯函数
    return findType;
}