
var fs = require("fs");

var AssemblyError = require("./assemblyError").AssemblyError;
var parseUtils = require("./parseUtils").parseUtils;
var lineUtils = require("./lineUtils").lineUtils;

function Assembler() {
    this.rootLineList = [];
    // Map from name to Expression.
    this.constantDefinitionMap = {};
    // Map from name to MacroDefinition.
    this.macroDefinitionMap = {};
    this.entryPointFunctionDefinition = null;
    // Map from name to FunctionDefinition.
    this.functionDefinitionMap = {};
    this.appDataLineList = [];
    this.nextMacroInvocationId = 0;
}

Assembler.prototype.getNextMacroInvocationId = function() {
    var output = this.nextMacroInvocationId;
    this.nextMacroInvocationId += 1;
    return output;
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
    var name;
    for (name in this.constantDefinitionMap) {
        var tempExpression = this.constantDefinitionMap[name];
        console.log(name + " = " + tempExpression.toString());
    }
    console.log("\n= = = MACRO DEFINITIONS = = =\n");
    var name;
    for (name in this.macroDefinitionMap) {
        var tempDefinition = this.macroDefinitionMap[name];
        console.log(name + " " + tempDefinition.argNameList.join(", ") + ":");
        lineUtils.printLineList(tempDefinition.lineList, 1);
        console.log("");
    }
    console.log("= = = FUNCTION DEFINITIONS = = =\n");
    console.log("Entry point function:");
    lineUtils.printLineList(this.entryPointFunctionDefinition.lineList, 1);
    console.log("");
    var name;
    for (name in this.functionDefinitionMap) {
        var tempDefinition = this.functionDefinitionMap[name];
        var tempText;
        if (tempDefinition.isPublic) {
            tempText = "Public function";
        } else {
            tempText = "Private function";
        }
        console.log(tempText + " " + name + ":");
        lineUtils.printLineList(tempDefinition.lineList, 1);
        if (tempDefinition.jumpTableLineList.length > 0) {
            console.log("Jump table:");
            lineUtils.printLineList(tempDefinition.jumpTableLineList, 1);
        }
        console.log("");
    }
    console.log("= = = APP DATA LINE LIST = = =\n");
    lineUtils.printLineList(this.appDataLineList);
    console.log("");
}

Assembler.prototype.assembleCodeFile = function(sourcePath, destinationPath) {
    try {
        this.rootLineList = this.loadAndParseAssemblyFile(sourcePath);
        this.rootLineList = this.extractFunctionDefinitions(this.rootLineList);
        this.rootLineList = this.extractAppDataDefinitions(this.rootLineList);
        if (this.entryPointFunctionDefinition === null) {
            throw new AssemblyError("Application must contain exactly one entry point.");
        }
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
require("./includeDirective");


