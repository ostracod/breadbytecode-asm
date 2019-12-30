
import * as fs from "fs";

import {LineProcessor, ExpressionProcessor} from "models/items";
import {Assembler as AssemblerInterface, AssemblyLine, FunctionDefinition} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {IdentifierMap} from "objects/identifier";
import {MacroDefinition} from "objects/macroDefinition";
import {AliasDefinition} from "objects/aliasDefinition";
import {
    PrivateFunctionDefinition,
    PublicFunctionDefinition,
    GuardFunctionDefinition
} from "objects/functionDefinition";
import {AppDataLineList} from "objects/labeledLineList";

import {parseUtils} from "utils/parseUtils";
import {lineUtils} from "utils/lineUtils";
import {variableUtils} from "utils/variableUtils";

export interface Assembler extends AssemblerInterface {}

export class Assembler {
    constructor() {
        this.rootLineList = [];
        // Map from identifier to AliasDefinition.
        this.aliasDefinitionMap = new IdentifierMap();
        // Map from name to MacroDefinition.
        this.macroDefinitionMap = {};
        this.functionDefinitionList = [];
        this.appDataLineList = null;
        this.globalVariableDefinitionList = [];
        this.nextMacroInvocationId = 0;
    }
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

Assembler.prototype.extractMacroDefinitions = function(lineList: AssemblyLine[]): AssemblyLine[] {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "MACRO") {
            if (tempArgList.length < 1) {
                throw new AssemblyError("Expected at least 1 argument.");
            }
            var tempNameIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempName = tempNameIdentifier.name;
            var tempIdentifierList = [];
            var index = 1;
            while (index < tempArgList.length) {
                var tempIdentifier = tempArgList[index].evaluateToIdentifier();
                tempIdentifierList.push(tempIdentifier);
                index += 1;
            }
            var tempDefinition = new MacroDefinition(
                tempName,
                tempIdentifierList,
                line.codeBlock
            );
            self.macroDefinitionMap[tempName] = tempDefinition;
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}

Assembler.prototype.getNextMacroInvocationId = function(): number {
    var output = this.nextMacroInvocationId;
    this.nextMacroInvocationId += 1;
    return output;
}

Assembler.prototype.expandMacroInvocations = function(lineList: AssemblyLine[]): {lineList: AssemblyLine[], expandCount: number} {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempDirectiveName = line.directiveName;
        if (tempDirectiveName in self.macroDefinitionMap) {
            var tempDefinition = self.macroDefinitionMap[tempDirectiveName];
            var macroInvocationId = self.getNextMacroInvocationId();
            return tempDefinition.invoke(line.argList, macroInvocationId);
        }
        return null;
    }, true);
    return {
        lineList: tempResult.lineList,
        expandCount: tempResult.processCount
    };
}

Assembler.prototype.extractAliasDefinitions = function(lineList: AssemblyLine[]): AssemblyLine[] {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "DEF") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempExpression = tempArgList[1];
            var tempDefinition = new AliasDefinition(tempIdentifier, tempExpression);
            self.aliasDefinitionMap.set(tempIdentifier, tempDefinition);
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}

Assembler.prototype.expandAliasInvocations = function(): void {
    var self = this;
    self.processExpressionsInLines(function(expression) {
        var tempIdentifier = expression.evaluateToIdentifierOrNull();
        if (tempIdentifier === null) {
            return null;
        }
        var tempDefinition = self.aliasDefinitionMap.get(tempIdentifier);
        if (tempDefinition === null) {
            return null;
        }
        return tempDefinition.expression.copy();
    }, true);
}

Assembler.prototype.processIncludeDirectives = function(lineList: AssemblyLine[]): {lineList: AssemblyLine[], includeCount: number} {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "INCLUDE") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempPath = tempArgList[0].evaluateToString();
            return self.loadAndParseAssemblyFile(tempPath);
        }
        return null;
    });
    return {
        lineList: tempResult.lineList,
        includeCount: tempResult.processCount
    };
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
        tempLineList = this.extractAliasDefinitions(tempLineList);
        var tempResult = this.processIncludeDirectives(tempLineList);
        tempLineList = tempResult.lineList;
        var tempIncludeCount = tempResult.includeCount;
        if (tempExpandCount <= 0 && tempIncludeCount <= 0) {
            break;
        }
    }
    return tempLineList;
}

Assembler.prototype.addFunctionDefinition = function(functionDefinition: FunctionDefinition): void {
    functionDefinition.assembler = this;
    this.functionDefinitionList.push(functionDefinition);
}

Assembler.prototype.extractFunctionDefinitions = function(): void {
    var self = this;
    self.processLines(function(line) {
        var tempDirectiveName = line.directiveName;
        var tempArgList = line.argList;
        if (tempDirectiveName == "PRIVATE_FUNC") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            var tempIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempPrivateDefinition = new PrivateFunctionDefinition(
                tempIdentifier,
                line.codeBlock
            );
            self.addFunctionDefinition(tempPrivateDefinition);
            return [];
        }
        if (tempDirectiveName == "PUBLIC_FUNC") {
            var tempArbiterIndexExpression;
            if (tempArgList.length == 3) {
                tempArbiterIndexExpression = tempArgList[2];
            } else if (tempArgList.length == 2) {
                tempArbiterIndexExpression = null;
            } else {
                throw new AssemblyError("Expected 2 or 3 arguments.");
            }
            var tempIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempPublicDefinition = new PublicFunctionDefinition(
                tempIdentifier,
                tempArgList[1],
                tempArbiterIndexExpression,
                line.codeBlock
            );
            self.addFunctionDefinition(tempPublicDefinition);
            return [];
        }
        if (tempDirectiveName == "GUARD_FUNC") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempGuardDefinition = new GuardFunctionDefinition(
                tempIdentifier,
                tempArgList[1],
                line.codeBlock
            );
            self.addFunctionDefinition(tempGuardDefinition);
            return [];
        }
        return null;
    });
}

Assembler.prototype.extractAppDataDefinitions = function(): void {
    var tempLineList = [];
    var self = this;
    self.processLines(function(line) {
        if (line.directiveName == "APP_DATA") {
            if (line.argList.length != 0) {
                throw new AssemblyError("Expected 0 arguments.");
            }
            var index = 0;
            while (index < line.codeBlock.length) {
                var tempLine = line.codeBlock[index];
                tempLineList.push(tempLine);
                index += 1;
            }
            return [];
        }
        return null
    });
    self.appDataLineList = new AppDataLineList(tempLineList);
    self.appDataLineList.extractLabelDefinitions();
}

Assembler.prototype.extractGlobalVariableDefinitions = function(): void {
    var self = this;
    self.processLines(function(line) {
        var tempDefinition = variableUtils.extractLocalVariableDefinition(line);
        if (tempDefinition !== null) {
            self.globalVariableDefinitionList.push(tempDefinition);
            return [];
        }
        return null;
    });
}

Assembler.prototype.assembleInstructions = function(): void {
    for (let functionDefinition of this.functionDefinitionList) {
        functionDefinition.assembleInstructions();
    }
}

Assembler.prototype.getDisplayString = function(): string {
    var tempTextList = [];
    tempTextList.push("\n= = = ROOT LINE LIST = = =\n");
    tempTextList.push(lineUtils.getLineListDisplayString(this.rootLineList));
    tempTextList.push("\n= = = ALIAS DEFINITIONS = = =\n");
    this.aliasDefinitionMap.iterate(function(definition) {
        tempTextList.push(definition.getDisplayString());
    });
    tempTextList.push("\n= = = MACRO DEFINITIONS = = =\n");
    var name;
    for (name in this.macroDefinitionMap) {
        var tempDefinition = this.macroDefinitionMap[name];
        tempTextList.push(tempDefinition.getDisplayString());
        tempTextList.push("");
    }
    tempTextList.push("= = = GLOBAL VARIABLE DEFINITIONS = = =\n");
    for (let variableDefinition of this.globalVariableDefinitionList) {
        tempTextList.push(variableDefinition.getDisplayString());
    }
    tempTextList.push("\n= = = FUNCTION DEFINITIONS = = =\n");
    var index = 0;
    while (index < this.functionDefinitionList.length) {
        var tempDefinition = this.functionDefinitionList[index]
        tempTextList.push(tempDefinition.getDisplayString());
        tempTextList.push("");
        index += 1;
    };
    tempTextList.push("= = = APP DATA LINE LIST = = =\n");
    tempTextList.push(this.appDataLineList.getDisplayString("Data body"));
    tempTextList.push("");
    return tempTextList.join("\n");
}

Assembler.prototype.assembleCodeFile = function(sourcePath: string, destinationPath: string): void {
    try {
        this.rootLineList = this.loadAndParseAssemblyFile(sourcePath);
        this.expandAliasInvocations();
        this.extractFunctionDefinitions();
        this.extractAppDataDefinitions();
        this.extractGlobalVariableDefinitions();
        this.assembleInstructions();
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


