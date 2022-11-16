const path = require('path');                                                         // 路径操作
const md5 = require('js-md5');                                                        // md5加密
const vueCompiler = require('@vue/compiler-dom');                                     // Vue编译器
const tsCompiler = require('typescript');                                             // TS编译器
const { getCode, writeTsFile } = require(path.join(__dirname, './file'));             // 文件工具
const { VUETEMPTSDIR } = require(path.join(__dirname, './constant'));                 // 常量模块

// 解析vue文件中的ts script片段，解析获取ast，checker
exports.parseVue = function(fileName) {
    // 获取vue代码
    const vueCode = getCode(fileName);
    // 解析vue代码
    const result = vueCompiler.parse(vueCode);
    const children = result.children;
    // 获取script片段
    let tsCode = '';
    let baseLine = 0;
    children.forEach(element => {
      if (element.tag == 'script') {
        tsCode = element.children[0].content;
        baseLine = element.loc.start.line - 1;
      }
    });
    // console.log(tsCode);
    // console.log(baseLine);
    const ts_hash_name = md5(fileName);
    // 将ts片段写入临时目录下的ts文件中
    writeTsFile(tsCode, `${VUETEMPTSDIR}/${ts_hash_name}`);
    const vue_temp_ts_name = path.join(process.cwd(), `${VUETEMPTSDIR}/${ts_hash_name}.ts`);
    // 将ts代码转化为AST
    const program = tsCompiler.createProgram([vue_temp_ts_name], {})
    const ast = program.getSourceFile(vue_temp_ts_name);
    const checker = program.getTypeChecker();
    // console.log(ast);
    return { ast, checker, baseLine };
}

// 解析ts文件代码，获取ast，checker
exports.parseTs = function(fileName) {
    // 将ts代码转化为AST
    const program = tsCompiler.createProgram([fileName], {})
    const ast = program.getSourceFile(fileName);
    const checker = program.getTypeChecker();
    // console.log(ast);
    return { ast, checker };
}