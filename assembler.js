
var fs = require("fs");

var AssemblyError = require("./assemblyError").AssemblyError;
var IdentifierMap = require("./identifier").IdentifierMap;
var parseUtils = require("./parseUtils").parseUtils;
var lineUtils = require("./lineUtils").lineUtils;

function Assembler() {
    this.rootLineList = [];
    // Map from identifier to ConstantDefinition.
    this.constantDefinitionMap = new IdentifierMap();
    // Map from name to MacroDefinition.
    this.macroDefinitionMap = {};
    this.functionDefinitionList = [];
    this.appDataLineList = [];
    this.globalVariableDefinitionList = [];
    this.nextMacroInvocationId = 0;
}

Assembler.prototype.getNextMacroInvocationId = function() {
    var output = this.nextMacroInvocationId;
    this.nextMacroInvocationId += 1;
    return output;
}

Assembler.prototype.processLines = function(processLine) {
    var tempResult = lineUtils.processLines(this.rootLineList, processLine);
    this.rootLineList = tempResult.lineList;
}

Assembler.prototype.loadAndParseAssemblyFile = function(path) {
    var tempLineTextList = parseUtils.loadAssemblyFileContent(path);
    var tempLineList = parseUtils.parseAssemblyLines(tempLineTextList);
    tempLineList = parseUtils.collapseCodeBlocks(tempLineList);
    tempLineList = this.extractMacroDefinitions(tempLineList);
    // We do all of this in a loop because included files may define
    // macros, and macros may define INCLUDE directives.
    while (true) {
        var tempResult = this.expandMacroInvocations(tempLineList);
        tempLineList = tempResult.lineList;
        var tempExpandCount = tempResult.expandCount;
        tempLineList = this.extractConstantDefinitions(tempLineList);
        var tempResult = this.processIncludeDirectives(tempLineList);
        tempLineList = tempResult.lineList;
        var tempIncludeCount = tempResult.includeCount;
        if (tempExpandCount <= 0 && tempIncludeCount <= 0) {
            break;
        }
    }
    return tempLineList;
}

Assembler.prototype.printAssembledState = function() {
    console.log("\n= = = ROOT LINE LIST = = =\n");
    lineUtils.printLineList(this.rootLineList);
    console.log("\n= = = CONSTANT DEFINITIONS = = =\n");
    this.constantDefinitionMap.iterate(function(definition) {
        definition.printAssembledState();
    });
    console.log("\n= = = MACRO DEFINITIONS = = =\n");
    var name;
    for (name in this.macroDefinitionMap) {
        var tempDefinition = this.macroDefinitionMap[name];
        tempDefinition.printAssembledState();
        console.log("");
    }
    console.log("= = = FUNCTION DEFINITIONS = = =\n");
    var index = 0;
    while (index < this.functionDefinitionList.length) {
        var tempDefinition = this.functionDefinitionList[index]
        tempDefinition.printAssembledState();
        console.log("");
        index += 1;
    };
    console.log("= = = APP DATA LINE LIST = = =\n");
    lineUtils.printLineList(this.appDataLineList);
    console.log("");
}

Assembler.prototype.assembleCodeFile = function(sourcePath, destinationPath) {
    try {
        this.rootLineList = this.loadAndParseAssemblyFile(sourcePath);
        this.extractFunctionDefinitions();
        this.extractAppDataDefinitions();
        this.extractGlobalVariableDefinitions();
    } catch(error) {
        if (error instanceof AssemblyError) {
            if (error.lineNumber === null) {
                console.log("Error: " + error.message);
            } else {
                console.log("Error on line " + error.lineNumber + ": " + error.message);
            }
            return;
        } else {
            throw error;
        }
    }
    
    // TEST CODE.
    this.printAssembledState();
    
    fs.writeFileSync(destinationPath, "TODO: Put actual bytecode here.");
    console.log("Finished assembling.");
    console.log("Destination path: " + destinationPath);
}

module.exports = {
    Assembler: Assembler
};

require("./constantDefinition");
require("./appDataDefinition");
require("./macroDefinition");
require("./functionDefinition");
require("./variableDefinition");
require("./includeDirective");


