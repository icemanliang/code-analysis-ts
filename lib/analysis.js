const path = require('path');                                                                                 // 路径处理
const vue_parser = require('@vue/compiler-dom');                                                              // vue文件解析器
const ts = require('typescript');                                                                             // ts代码解析器
const chalk = require('chalk');                                                                               // 美化输出
const ora = require('ora');                                                                                   // 美化命令行
const { scanFileTs, scanFileVue, getCode } = require(path.join(__dirname, './file'));                         // 文件操作
const { transform_apiMap } = require(path.join(__dirname, './transform'));                                    // 数据转化操作
const { scoreDeal } = require(path.join(__dirname, './score'));                                               // 代码评分

// 代码分析基础类
class CodeAnalysis {
  constructor(options) {
    this.scanPath = options.scanPath;                                                 // 分析目录
    this.reportDir = options.reportDir || 'code_report';                              // 分析报告目录配置
    this.target = options.target;                                                     // 要分析的依赖目标包
    this.browserApis = options.browserApis || [];                                     // 需要分析的browserApi
    this.blackApis = options.blackApis || [];                                         // 黑名单api
    this.isScanVue = options.isScanVue || false;                                      // 是否要扫描vue中的ts代码
    this.scoreFun = options.scoreFun || null;                                         // 自定义代码评分处理函数
    this.imports = {};                                                                // 文件import导入项目统计Map
    this.apiMap = {};                                                                 // API调用统计Map
    this.typeMap = {};                                                                // 类型引用统计Map
    this.noUseMap = {};                                                               // 引入但未调用api统计Map
    this.browserApiMap = {};                                                          // browserApi调用统计Map
    this.noParseFiles = [];                                                           // 异常代码文件数组
    this.scoreMap = {};                                                               // 代码评分及扣分事项
  }

  // 统计无调用api相关数据
  selectNoUseMap(map) {
    Object.keys(map).forEach(element => {
      if (map[element].callNum > 0) {
        delete map[element];
      }
    });
    Object.keys(map).forEach(element => {
      if (!this.noUseMap[element]) {
        this.noUseMap[element] = {};
        this.noUseMap[element].callNum = 1;
        this.noUseMap[element].callOrigin = [];
        this.noUseMap[element].callOrigin.push(map[element].filepath);
      } else {
        this.noUseMap[element].callNum++;
        if (!this.noUseMap[element].callOrigin.includes(map[element].filepath)) {
          this.noUseMap[element].callOrigin.push(map[element].filepath);
        }
      }
    });
  }

  // 分析vue代码，提取script片段
  parseVue(fileName) {
    const code = getCode(fileName);
    const result = vue_parser.parse(code);
    const children = result.children;
    let scriptContent = '';
    let line = 0;
    children.forEach(element => {
      if (element.tag == 'script') {
        scriptContent = element.children[0].content;
        line = element.loc.start.line - 1;
      }
    });
    return { scriptContent, line };
    // console.log(scriptContent);
  }
  // 分析import引入的项目
  searchFirstPart(ts_ast, filepath, scriptline = 0) {
    let importItems = [];
    let that = this;
    // 深度优先遍历AST树
    function walk(node) {
      // console.log(node);
      ts.forEachChild(node, walk); // 深度优先遍历
      const line = ts_ast.getLineAndCharacterOfPosition(node.getStart()).line + scriptline + 1;

      switch (node.kind) {
        case ts.SyntaxKind.ImportDeclaration:
          // console.log(node);
          try {
            if (node.moduleSpecifier.text == that.target) {
              //分析引用情况
              const tempArr = node.importClause.namedBindings.elements;
              tempArr.forEach(element => {
                if (element.name.kind == ts.SyntaxKind.Identifier) {
                  importItems.push({name: element.name.escapedText, line: line});
                  if (!that.imports[element.name.escapedText]) {
                    that.imports[element.name.escapedText] = [];
                    that.imports[element.name.escapedText].push(filepath);
                  } else {
                    that.imports[element.name.escapedText].push(filepath);
                  }
                }
              });
              // console.log(node.moduleSpecifier.text);
            }
          } catch (e) {
            // console.log('ignore');
          }
          break;
      }
    }
    walk(ts_ast);
    return importItems;
  }
  // AST分析
  searchApi(importItems, ts_ast, filepath, scriptline = 0) {
    let that = this;
    let isBrowserApi = this.browserApis.length>0 ? true : false;
    let _noUseMap = {};
    // 深度优先遍历AST树
    function walk(node) {
      // console.log(node);
      ts.forEachChild(node, walk); // 深度优先遍历
      const line = ts_ast.getLineAndCharacterOfPosition(node.getStart()).line + scriptline + 1;

      switch (node.kind) {
        case ts.SyntaxKind.CallExpression:    // 直接调用
          importItems.forEach(element => {
            try{
              if (node.expression.escapedText == element.name) {
                const temp = node.expression.escapedText;
                if (!that.apiMap[temp]) {
                  that.apiMap[temp] = {};
                  that.apiMap[temp].callNum = 1;
                  that.apiMap[temp].callOrigin = {};
                  that.apiMap[temp].callOrigin[filepath] =[];
                  that.apiMap[temp].callOrigin[filepath].push(line);
                }else {
                  that.apiMap[temp].callNum++;
                  if (!Object.keys(that.apiMap[temp].callOrigin).includes(filepath)) {
                    that.apiMap[temp].callOrigin[filepath] =[];
                    that.apiMap[temp].callOrigin[filepath].push(line);
                  }else{
                    that.apiMap[temp].callOrigin[filepath].push(line);
                  }
                }
              }
            }catch(e){
              // console.log(e);
            }
          })
          break;
        case ts.SyntaxKind.PropertyAccessExpression:    // 链式调用
          importItems.forEach(element => {
            try {
              if (node.expression.escapedText == element.name) {
                // console.log(node.expression.escapedText+'.'+node.name.escapedText);
                const temp = node.expression.escapedText + '.' + node.name.escapedText;
                if (!that.apiMap[temp]) {
                  that.apiMap[temp] = {};
                  that.apiMap[temp].callNum = 1;
                  that.apiMap[temp].callOrigin = {};
                  that.apiMap[temp].callOrigin[filepath] =[];
                  that.apiMap[temp].callOrigin[filepath].push(line);
                } else {
                  that.apiMap[temp].callNum++;
                  if (!Object.keys(that.apiMap[temp].callOrigin).includes(filepath)) {
                    that.apiMap[temp].callOrigin[filepath] =[];
                    that.apiMap[temp].callOrigin[filepath].push(line);
                  }else{
                    that.apiMap[temp].callOrigin[filepath].push(line);
                  }
                }
              }
            } catch (e) {
              // console.log(e);
            }
            try {
              if (node.expression.expression.escapedText == element.name) {
                const temp = node.expression.expression.escapedText + '.' + node.expression.name.escapedText + '.' + node.name.escapedText;
                if (!that.apiMap[temp]) {
                  that.apiMap[temp] = {};
                  that.apiMap[temp].callNum = 1;
                  that.apiMap[temp].callOrigin = {};
                  that.apiMap[temp].callOrigin[filepath] =[];
                  that.apiMap[temp].callOrigin[filepath].push(line);
                } else {
                  that.apiMap[temp].callNum++;
                  if (!Object.keys(that.apiMap[temp].callOrigin).includes(filepath)) {
                    that.apiMap[temp].callOrigin[filepath] =[];
                    that.apiMap[temp].callOrigin[filepath].push(line);
                  }else{
                    that.apiMap[temp].callOrigin[filepath].push(line);
                  }
                }
              }
            } catch (e) {
              // console.log('undefined',e);
            }
          });

          // browser api调用分析
          if(isBrowserApi){
            that.browserApis.forEach(element => {
              try {
                if (node.expression.escapedText == element) {
                  // console.log(node.expression.escapedText+'.'+node.name.escapedText);
                  const temp = node.expression.escapedText;
                  const method = node.name.escapedText;
                  if (!that.browserApiMap[temp]) {
                    that.browserApiMap[temp] = {};
                    that.browserApiMap[temp][method] = {};
                    that.browserApiMap[temp][method].callNum = 1;
                    that.browserApiMap[temp][method].callOrigin = {};
                    that.browserApiMap[temp][method].callOrigin[filepath] =[];
                    that.browserApiMap[temp][method].callOrigin[filepath].push(line);
                  } else {
                    if (!that.browserApiMap[temp][method]) {
                      that.browserApiMap[temp][method] = {};
                      that.browserApiMap[temp][method].callNum = 1;
                      that.browserApiMap[temp][method].callOrigin = {};
                      that.browserApiMap[temp][method].callOrigin[filepath] =[];
                      that.browserApiMap[temp][method].callOrigin[filepath].push(line);
                    } else {
                      that.browserApiMap[temp][method].callNum++;
                      if (!Object.keys(that.browserApiMap[temp][method].callOrigin).includes(filepath)) {
                        that.browserApiMap[temp][method].callOrigin[filepath] =[];
                        that.browserApiMap[temp][method].callOrigin[filepath].push(line);
                      }else{
                        that.browserApiMap[temp][method].callOrigin[filepath].push(line);
                      }
                    }
                  }
                }
              } catch (e) {
                // console.log('ignore');
              }
            });
          }   
          break;
        case ts.SyntaxKind.TypeReference: // 被当成类型使用
          importItems.forEach(element => {
            const type = node.typeName.escapedText;
            if (element.name == type) {
              if (!that.typeMap[element.name]) {
                that.typeMap[element.name] = {};
                that.typeMap[element.name].callNum = 1;
                that.typeMap[element.name].callOrigin = {};
                that.typeMap[element.name].callOrigin[filepath] =[];
                that.typeMap[element.name].callOrigin[filepath].push(line);
              } else {
                that.typeMap[element.name].callNum++;
                if (!Object.keys(that.typeMap[element.name].callOrigin).includes(filepath)) {
                  that.typeMap[element.name].callOrigin[filepath] =[];
                  that.typeMap[element.name].callOrigin[filepath].push(line);
                }else{
                  that.typeMap[element.name].callOrigin[filepath].push(line);
                }
              }
              // console.log(node.typeName.escapedText);
            }
          });
          break;
        case ts.SyntaxKind.Identifier:    // 引入未调用分析
          importItems.forEach(element => {
            if (!_noUseMap[element.name]) {
              _noUseMap[element.name] = {};
              _noUseMap[element.name].callNum = 0;
              _noUseMap[element.name].filepath = filepath + ' : ' + element.line;
            }
            try {
              if (node.parent && node.parent.kind == ts.SyntaxKind.ImportSpecifier) return; //排除import引入本身
            } catch (e) {
              // console.log('ignore');
            }
            const keyItem = node.escapedText;
            if (element.name == keyItem) {
              _noUseMap[element.name].callNum++;
            }
          });
          break;
      }
    }
    walk(ts_ast);

    // 遍历结束收集noUseMap
    this.selectNoUseMap(_noUseMap);
  }
  // 分析所有vue文件
  dealModuleVue(scanPath) {
    const entryFiles = scanFileVue(scanPath);
    // console.log(entryFiles);
    if (entryFiles.length == 0) return;
    entryFiles.forEach(element => {
      const mfpath = element.substring(element.indexOf(this.scanPath));
      try {
        // 获取ts代码片段
        const { scriptContent: tsCode, line } = this.parseVue(element);
        // 将TS代码转化为AST树
        const ts_ast = ts.createSourceFile('analysis', tsCode, ts.ScriptTarget.Latest, true);
        // 从import语句中获取导入的需要分析的目标API
        const importItems = this.searchFirstPart(ts_ast, mfpath, line);
        // console.log(importItems);
        // 递归AST语法树分析，统计相关信息
        this.searchApi(importItems, ts_ast, mfpath, line);
      } catch (e) {
        this.noParseFiles.push({
          file: mfpath,
          stack: e.stack
        });
      }
    });
  }
  // 分析所有ts文件
  dealModuleTS(scanPath) {
    const entryFiles = scanFileTs(scanPath);
    // console.log(entryFiles);
    if (entryFiles.length == 0) return;
    entryFiles.forEach(element => {
      const mfpath = element.substring(element.indexOf(this.scanPath));
      try {
        // 获取ts代码片段
        const tsCode = getCode(element);
        // 将TS代码转化为AST树
        const ts_ast = ts.createSourceFile('analysis', tsCode, ts.ScriptTarget.Latest, true);
        // 从import语句中获取导入的需要分析的目标API
        const importItems = this.searchFirstPart(ts_ast, mfpath);
        // console.log(importItems);
        // 递归AST语法树分析，统计相关信息
        this.searchApi(importItems, ts_ast, mfpath);
      } catch (e) {
        this.noParseFiles.push({
          file: mfpath,
          stack: e.stack
        });
      }
    });
  }
  // 分析入口函数
  analysis() {
    const spinner = ora(chalk.blue('analysis start')).start();
    // 扫描文件，分析代码，生成数据map
    if(this.isScanVue){
      this.dealModuleVue(this.scanPath);
    }
    this.dealModuleTS(this.scanPath);
    // console.log(this.apiMap);
    // 转化数据
    this.apiMap = transform_apiMap(this.apiMap, this.imports, this.blackApis);
    // console.log(this.apiMap);
    // 代码评分
    if(this.scoreFun && typeof(this.scoreFun) ==='function'){
      this.scoreMap = this.scoreFun(this);
    }else{
      this.scoreMap = scoreDeal(this);
    }
    spinner.succeed('analysis' + chalk.green(' success'));
  }
}

module.exports = CodeAnalysis;
