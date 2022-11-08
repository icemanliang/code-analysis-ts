const path = require('path');                                                                                 // 路径处理
const tsCompiler = require('typescript');                                                                     // TS编译器
const { scanFileTs, scanFileVue } = require(path.join(__dirname, './file'));                                  // 文件工具
const { parseVue, parseTs } = require(path.join(__dirname, './parse'));                                       // 解析AST
const { transformApiMap } = require(path.join(__dirname, './transform'));                                     // 数据转化
const { defaultScorePlugin } = require(path.join(__dirname, './score'));                                      // 评分插件

// 代码分析基础类
class CodeAnalysis {
  constructor(options) {
    // 私有属性
    this._scanSource = options.scanSource;                                             // 待扫描源码的配置信息       
    this._analysisTarget = options.analysisTarget;                                     // 要分析的目标依赖           
    this._blackApis = options.blackApis || [];                                         // 需要标记的黑名单api        
    this._browserApis = options.browserApis || [];                                     // 需要分析的browserApi         
    this._isScanVue = options.isScanVue || false;                                      // 是否要扫描vue中的ts代码    
    this._scorePlugin = options.scorePlugin || null;                                   // 代码评分插件           
    this._imports = {};                                                                // import项目统计Map         
    // 公共属性
    this.apiMap = {};                                                                  // API调用统计Map            
    this.typeMap = {};                                                                 // 类型引用统计Map            
    this.noUseMap = {};                                                                // 引入但未调用项目统计Map     
    this.browserApiMap = {};                                                           // browserApi调用统计Map     
    this.parseErrorFiles = [];                                                         // 解析异常文件数组           
    this.scoreMap = {};                                                                // 代码评分及建议Map          
  }

  // 统计引入但未调用api相关数据
  _collectNoUse(map) {
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

  // 分析import引入
  _findImportItems(ast, filepath, scriptline = 0) {
    let importItems = [];
    let that = this;
    // 遍历AST
    function walk(node) {
      // console.log(node);
      tsCompiler.forEachChild(node, walk);
      const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + scriptline + 1;

      switch (node.kind) {
        case tsCompiler.SyntaxKind.ImportDeclaration:
          // console.log(node);
          try {
            // 分析引入情况
            if (node.moduleSpecifier && 
              node.moduleSpecifier.text && 
              node.moduleSpecifier.text == that._analysisTarget &&
              node.importClause && 
              node.importClause.namedBindings && 
              node.importClause.namedBindings.elements &&
              node.importClause.namedBindings.elements.length>0) {
              // console.log(node.moduleSpecifier.text);
              // console.log(node.importClause.namedBindings.elements);
              const tempArr = node.importClause.namedBindings.elements;
              tempArr.forEach(element => {
                if (element.name.kind == tsCompiler.SyntaxKind.Identifier) {
                  importItems.push({name: element.name.escapedText, line: line});
                  if (!that._imports[element.name.escapedText]) {
                    that._imports[element.name.escapedText] = [];
                    that._imports[element.name.escapedText].push(filepath);
                  } else {
                    that._imports[element.name.escapedText].push(filepath);
                  }
                }
              });
            }
          } catch (e) {
            console.log(e);
          }
          break;
      }
    }
    walk(ast);
    return importItems;
  }
  // AST分析
  _dealAST(importItems, ast, filepath, projectName, httpRepo, scriptline = 0) {
    let that = this;
    let _noUseMap = {};
    // 遍历AST
    function walk(node) {
      // console.log(node);
      tsCompiler.forEachChild(node, walk);
      const line = ast.getLineAndCharacterOfPosition(node.getStart()).line + scriptline + 1;

      switch (node.kind) {
        case tsCompiler.SyntaxKind.CallExpression:               // 直接调用
          importItems.forEach(element => {
            try{
              if (node.expression && node.expression.escapedText && node.expression.escapedText == element.name) {
                // console.log(node.expression.escapedText);
                const temp = node.expression.escapedText;
                if (!that.apiMap[temp]) {
                  that.apiMap[temp] = {};
                  that.apiMap[temp].callNum = 1;
                  that.apiMap[temp].callOrigin = {};
                  that.apiMap[temp].callOrigin[filepath] = {};
                  that.apiMap[temp].callOrigin[filepath].projectName = projectName;
                  that.apiMap[temp].callOrigin[filepath].httpRepo = httpRepo;
                  that.apiMap[temp].callOrigin[filepath].lines = [];
                  that.apiMap[temp].callOrigin[filepath].lines.push(line);
                }else {
                  that.apiMap[temp].callNum++;
                  if (!Object.keys(that.apiMap[temp].callOrigin).includes(filepath)) {
                    that.apiMap[temp].callOrigin[filepath] = {};
                    that.apiMap[temp].callOrigin[filepath].projectName = projectName;
                    that.apiMap[temp].callOrigin[filepath].httpRepo = httpRepo;
                    that.apiMap[temp].callOrigin[filepath].lines = [];
                    that.apiMap[temp].callOrigin[filepath].lines.push(line);
                  }else{
                    that.apiMap[temp].callOrigin[filepath].lines.push(line);
                  }
                }
              }
            }catch(e){
              console.log(e);
            }
          })
          break;
        case tsCompiler.SyntaxKind.PropertyAccessExpression:    // 链式调用
          importItems.forEach(element => {
            try {
              if (node.name && 
                node.name.escapedText && 
                node.expression && 
                node.expression.escapedText && 
                node.expression.escapedText == element.name) {
                // console.log(node.expression.escapedText + '.' + node.name.escapedText);
                const temp = node.expression.escapedText + '.' + node.name.escapedText;
                if (!that.apiMap[temp]) {
                  that.apiMap[temp] = {};
                  that.apiMap[temp].callNum = 1;
                  that.apiMap[temp].callOrigin = {};
                  that.apiMap[temp].callOrigin[filepath] = {};
                  that.apiMap[temp].callOrigin[filepath].projectName = projectName;
                  that.apiMap[temp].callOrigin[filepath].httpRepo = httpRepo;
                  that.apiMap[temp].callOrigin[filepath].lines = [];
                  that.apiMap[temp].callOrigin[filepath].lines.push(line);
                } else {
                  that.apiMap[temp].callNum++;
                  if (!Object.keys(that.apiMap[temp].callOrigin).includes(filepath)) {
                    that.apiMap[temp].callOrigin[filepath] = {};
                    that.apiMap[temp].callOrigin[filepath].projectName = projectName;
                    that.apiMap[temp].callOrigin[filepath].httpRepo = httpRepo;
                    that.apiMap[temp].callOrigin[filepath].lines = [];
                    that.apiMap[temp].callOrigin[filepath].lines.push(line);
                  }else{
                    that.apiMap[temp].callOrigin[filepath].lines.push(line);
                  }
                }
              }
            } catch (e) {
              console.log(e);
            }
            try {
              if (node.name &&
                node.name.escapedText &&
                node.expression &&
                node.expression.name &&
                node.expression.name.escapedText &&
                node.expression.expression && 
                node.expression.expression.escapedText && 
                node.expression.expression.escapedText == element.name) {
                // console.log(node.expression.expression.escapedText + '.' + node.expression.name.escapedText + '.' + node.name.escapedText);
                const temp = node.expression.expression.escapedText + '.' + node.expression.name.escapedText + '.' + node.name.escapedText;
                if (!that.apiMap[temp]) {
                  that.apiMap[temp] = {};
                  that.apiMap[temp].callNum = 1;
                  that.apiMap[temp].callOrigin = {};
                  that.apiMap[temp].callOrigin[filepath] = {};
                  that.apiMap[temp].callOrigin[filepath].projectName = projectName;
                  that.apiMap[temp].callOrigin[filepath].httpRepo = httpRepo;
                  that.apiMap[temp].callOrigin[filepath].lines = [];
                  that.apiMap[temp].callOrigin[filepath].lines.push(line);
                } else {
                  that.apiMap[temp].callNum++;
                  if (!Object.keys(that.apiMap[temp].callOrigin).includes(filepath)) {
                    that.apiMap[temp].callOrigin[filepath] = {};
                    that.apiMap[temp].callOrigin[filepath].projectName = projectName;
                    that.apiMap[temp].callOrigin[filepath].httpRepo = httpRepo;
                    that.apiMap[temp].callOrigin[filepath].lines = [];
                    that.apiMap[temp].callOrigin[filepath].lines.push(line);
                  }else{
                    that.apiMap[temp].callOrigin[filepath].lines.push(line);
                  }
                }
              }
            } catch (e) {
              console.log(e);
            }
          });

          // browser api调用分析
          if(that._browserApis.length>0){
            that._browserApis.forEach(element => {
              try {
                if (node.name && 
                  node.name.escapedText && 
                  node.expression && 
                  node.expression.escapedText && 
                  node.expression.escapedText == element) {
                  // console.log(node.expression.escapedText + '.' + node.name.escapedText);
                  const temp = node.expression.escapedText;
                  const method = node.name.escapedText;
                  if (!that.browserApiMap[temp]) {
                    that.browserApiMap[temp] = {};
                    that.browserApiMap[temp][method] = {};
                    that.browserApiMap[temp][method].callNum = 1;
                    that.browserApiMap[temp][method].callOrigin = {};
                    that.browserApiMap[temp][method].callOrigin[filepath] = {};
                    that.browserApiMap[temp][method].callOrigin[filepath].projectName = projectName;
                    that.browserApiMap[temp][method].callOrigin[filepath].httpRepo = httpRepo;
                    that.browserApiMap[temp][method].callOrigin[filepath].lines = [];
                    that.browserApiMap[temp][method].callOrigin[filepath].lines.push(line);
                  } else {
                    if (!that.browserApiMap[temp][method]) {
                      that.browserApiMap[temp][method] = {};
                      that.browserApiMap[temp][method].callNum = 1;
                      that.browserApiMap[temp][method].callOrigin = {};
                      that.browserApiMap[temp][method].callOrigin[filepath] = {};
                      that.browserApiMap[temp][method].callOrigin[filepath].projectName = projectName;
                      that.browserApiMap[temp][method].callOrigin[filepath].httpRepo = httpRepo;
                      that.browserApiMap[temp][method].callOrigin[filepath].lines = [];
                      that.browserApiMap[temp][method].callOrigin[filepath].lines.push(line);
                    } else {
                      that.browserApiMap[temp][method].callNum++;
                      if (!Object.keys(that.browserApiMap[temp][method].callOrigin).includes(filepath)) {
                        that.browserApiMap[temp][method].callOrigin[filepath] = {};
                        that.browserApiMap[temp][method].callOrigin[filepath].projectName = projectName;
                        that.browserApiMap[temp][method].callOrigin[filepath].httpRepo = httpRepo;
                        that.browserApiMap[temp][method].callOrigin[filepath].lines = [];
                        that.browserApiMap[temp][method].callOrigin[filepath].lines.push(line);
                      }else{
                        that.browserApiMap[temp][method].callOrigin[filepath].lines.push(line);
                      }
                    }
                  }
                }
              } catch (e) {
                console.log(e);
              }
            });
          }   
          break;
        case tsCompiler.SyntaxKind.TypeReference:    // 被当成类型使用
          importItems.forEach(element => {
            try{
              if (node.typeName && node.typeName.escapedText && element.name == node.typeName.escapedText) {
                // console.log(node.typeName.escapedText);
                if (!that.typeMap[element.name]) {
                  that.typeMap[element.name] = {};
                  that.typeMap[element.name].callNum = 1;
                  that.typeMap[element.name].callOrigin = {};
                  that.typeMap[element.name].callOrigin[filepath] = {};
                  that.typeMap[element.name].callOrigin[filepath].projectName = projectName;
                  that.typeMap[element.name].callOrigin[filepath].httpRepo = httpRepo;
                  that.typeMap[element.name].callOrigin[filepath].lines = [];
                  that.typeMap[element.name].callOrigin[filepath].lines.push(line);
                } else {
                  that.typeMap[element.name].callNum++;
                  if (!Object.keys(that.typeMap[element.name].callOrigin).includes(filepath)) {
                    that.typeMap[element.name].callOrigin[filepath] = {};
                    that.typeMap[element.name].callOrigin[filepath].projectName = projectName;
                    that.typeMap[element.name].callOrigin[filepath].httpRepo = httpRepo;
                    that.typeMap[element.name].callOrigin[filepath].lines = [];
                    that.typeMap[element.name].callOrigin[filepath].lines.push(line);
                  }else{
                    that.typeMap[element.name].callOrigin[filepath].lines.push(line);
                  }
                }
              }
            }catch(e){
              console.log(e);
            }
          });
          break;
        case tsCompiler.SyntaxKind.Identifier:    // 引入未调用分析
          importItems.forEach(element => {
            if (!_noUseMap[element.name]) {
              _noUseMap[element.name] = {};
              _noUseMap[element.name].callNum = 0;
              _noUseMap[element.name].filepath = {};
              _noUseMap[element.name].filepath.projectName = projectName;
              _noUseMap[element.name].filepath.httpRepo = httpRepo;
              _noUseMap[element.name].filepath.path = filepath;
              _noUseMap[element.name].filepath.lines = [element.line];

            }
            try {
              if (node.parent && node.parent.kind == tsCompiler.SyntaxKind.ImportSpecifier) return;           //排除import引入本身
            } catch (e) {
              console.log(e);
            }
            if (node.escapedText && element.name == node.escapedText) {
              _noUseMap[element.name].callNum++;
            }
          });
          break;
      }
    }
    walk(ast);

    // 遍历结束收集noUseMap
    this._collectNoUse(_noUseMap);
  }

  // 扫描文件
  _scanFiles(scanSource, type) {
    let entrys = [];
    scanSource.forEach((item)=>{
      const entryObj = {
        name: item.name,
        httpRepo: item.httpRepo
      }
      let parse = [];
      let show = [];
      const scanPath = item.path;
      scanPath.forEach((sitem)=>{
        let tempEntry = [];
        if(type ==='vue'){
          tempEntry = scanFileVue(sitem);
        }else if(type ==='ts'){
          tempEntry = scanFileTs(sitem);
        }
        let tempPath = tempEntry.map((titem)=>{
          if(item.format && typeof(item.format) ==='function'){
            return item.format(titem.substring(titem.indexOf(sitem)));
          }else{
            return titem.substring(titem.indexOf(sitem));
          }
        })
        parse = parse.concat(tempEntry);
        show = show.concat(tempPath);
      })
      entryObj.parse = parse;
      entryObj.show = show;
      entrys.push(entryObj);
    })
    return entrys;
  }

  // 扫描文件，分析代码
  _scanCode(scanSource, type) {
    let entrys = this._scanFiles(scanSource, type);
    // console.log(entrys);
    entrys.forEach((item)=>{
      const parseFiles = item.parse;
      if(parseFiles.length>0){
        parseFiles.forEach((element, eIndex) => {
          const showPath = item.show[eIndex];
          try {
            if(type ==='vue'){
              const { ast, line } = parseVue(element);                                              // 解析vue文件中的ts script片段,将其转化为AST
              const importItems = this._findImportItems(ast, showPath, line);                        // 从import语句中获取导入的需要分析的目标API
              // console.log(importItems);
              if(importItems.length>0 || this._browserApis.length>0){
                this._dealAST(importItems, ast, showPath, item.name, item.httpRepo, line);           // 递归分析AST，统计相关信息
              }
            }else if(type ==='ts'){
              const { ast } = parseTs(element);                                                     // 解析ts文件代码,将其转化为AST
              const importItems = this._findImportItems(ast, showPath);                              // 从import语句中获取导入的需要分析的目标API
              // console.log(importItems);
              if(importItems.length>0 || this._browserApis.length>0){
                this._dealAST(importItems, ast, showPath, item.name, item.httpRepo);                 // 递归分析AST，统计相关信息
              }
            }
          } catch (e) {
            this.parseErrorFiles.push({
              projectName: item.name,
              httpRepo: item.httpRepo,
              file: showPath,
              stack: e.stack
            });
          }
        });
      }
    })
  }
  // 入口函数
  analysis() {
    // 扫描分析
    if(this._isScanVue){
      this._scanCode(this._scanSource, 'vue');
    }
    this._scanCode(this._scanSource, 'ts');
    // 转化数据
    this.apiMap = transformApiMap(this.apiMap, this._imports, this._blackApis);
    // 代码评分
    if(this._scorePlugin){
      if(typeof(this._scorePlugin) ==='function'){
        this.scoreMap = this._scorePlugin(this);
      }
      if(this._scorePlugin ==='default'){
        this.scoreMap = defaultScorePlugin(this);
      }
    }else{
      this.scoreMap = null;
    }
    // console.log(this.apiMap);
    // console.log(this.typeMap);
    // console.log(this.noUseMap);
    // console.log(this.browserApiMap);
    // console.log(this.parseErrorFiles);
    // console.log(this.scoreMap);
  }
}

module.exports = CodeAnalysis;
