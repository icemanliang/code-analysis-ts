const path =require('path');                                                          // 路径操作
const vueCompiler = require('@vue/compiler-dom');                                     // Vue编译器
const tsCompiler = require('typescript');                                             // TS编译器
const { getCode } = require(path.join(__dirname, './file'));                          // 文件操作工具方法

// 解析vue文件中的ts script片段,并转化为AST
exports.parseVue = function(fileName) {
    // 获取vue代码
    const vueCode = getCode(fileName);
    // 解析vue代码
    const result = vueCompiler.parse(vueCode);
    const children = result.children;
    let scriptContent = '';
    let line = 0;
    children.forEach(element => {
      if (element.tag == 'script') {
        scriptContent = element.children[0].content;
        line = element.loc.start.line - 1;
      }
    });
    // console.log(scriptContent);
    // 将ts代码转化为AST
    const ast = tsCompiler.createSourceFile('analysis', scriptContent, tsCompiler.ScriptTarget.Latest, true);
    // console.log(ast);
    return { ast, line };
}

// 解析ts文件代码，并转化为AST
exports.parseTs = function(fileName) {
    // 获取ts代码
    const tsCode = getCode(fileName);
    // 将ts代码转化为AST
    const ast = tsCompiler.createSourceFile('analysis', tsCode, tsCompiler.ScriptTarget.Latest, true);
    // console.log(ast);
    return { ast};
}