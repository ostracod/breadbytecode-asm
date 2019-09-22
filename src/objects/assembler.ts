
import * as fs from "fs";

import {LineProcessor, ExpressionProcessor} from "models/items";
import {Assembler as AssemblerInterface, AssemblyLine} from "models/objects";
import {AssemblyError} from "objects/assemblyError";
import {IdentifierMap} from "objects/identifier";
import {parseUtils} from "utils/parseUtils";
import {lineUtils} from "utils/lineUtils";

export interface Assembler extends AssemblerInterface {}

export class Assembler {
    constructor() {
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
}

Assembler.prototype.getNextMacroInvocationId = function(): number {
    var output = this.nextMacroInvocationId;
    this.nextMacroInvocationId += 1;
    return output;
}

Assembler.prototype.processLines = function(processLine: LineProcessor): void {
    var tempResult = lineUtils.processLines(this.rootLineList, processLine);
    this.rootLineList = tempResult.lineList;
}

Assembler.prototype.processExpressionsInLines = function(
    processExpression: ExpressionProcessor,
    shouldRecurAfterProcess?: boolean
): void {
    lineUtils.processExpressionsInLines(this.rootLineList, processExpression, shouldRecurAfterProcess);
}

Assembler.prototype.loadAndParseAssemblyFile = function(path: string): AssemblyLine[] {
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

Assembler.prototype.getDisplayString = function(): string {
    var tempTextList = [];
    tempTextList.push("\n= = = ROOT LINE LIST = = =\n");
    tempTextList.push(lineUtils.getLineListDisplayString(this.rootLineList));
    tempTextList.push("\n= = = CONSTANT DEFINITIONS = = =\n");
    this.constantDefinitionMap.iterate(function(definition) {
        tempTextList.push(definition.getDisplayString());
    });
    tempTextList.push("\n= = = MACRO DEFINITIONS = = =\n");
    var name;
    for (name in this.macroDefinitionMap) {
        var tempDefinition = this.macroDefinitionMap[name];
        tempTextList.push(tempDefinition.getDisplayString());
        tempTextList.push("");
    }
    tempTextList.push("= = = FUNCTION DEFINITIONS = = =\n");
    var index = 0;
    while (index < this.functionDefinitionList.length) {
        var tempDefinition = this.functionDefinitionList[index]
        tempTextList.push(tempDefinition.getDisplayString());
        tempTextList.push("");
        index += 1;
    };
    tempTextList.push("= = = APP DATA LINE LIST = = =\n");
    tempTextList.push(lineUtils.getLineListDisplayString(this.appDataLineList));
    tempTextList.push("");
    return tempTextList.join("\n");
}

Assembler.prototype.assembleCodeFile = function(sourcePath: string, destinationPath: string): void {
    try {
        this.rootLineList = this.loadAndParseAssemblyFile(sourcePath);
        this.expandConstantInvocations();
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
    console.log(this.getDisplayString());
    
    fs.writeFileSync(destinationPath, "TODO: Put actual bytecode here.");
    console.log("Finished assembling.");
    console.log("Destination path: " + destinationPath);
}

import "objects/constantDefinition";
import "objects/appDataDefinition";
import "objects/macroDefinition";
import "objects/functionDefinition";
import "objects/variableDefinition";
import "objects/includeDirective";


