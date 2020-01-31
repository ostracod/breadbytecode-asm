
import * as fs from "fs";

import {LineProcessor, ExpressionProcessor} from "models/items";
import {Assembler as AssemblerInterface, AssemblyLine, FunctionDefinition, Identifier, IndexDefinition, Region} from "models/objects";

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
import {REGION_TYPE, CompositeRegion} from "objects/region";

import {parseUtils} from "utils/parseUtils";
import {lineUtils} from "utils/lineUtils";
import {variableUtils} from "utils/variableUtils";

export interface Assembler extends AssemblerInterface {}

export class Assembler {
    constructor() {
        this.rootLineList = [];
        this.aliasDefinitionMap = new IdentifierMap();
        this.macroDefinitionMap = {};
        this.functionDefinitionMap = new IdentifierMap();
        this.appDataLineList = null;
        this.globalVariableDefinitionMap = new IdentifierMap();
        this.nextMacroInvocationId = 0;
        this.nextFunctionDefinitionIndex = 0;
        this.indexDefinitionMapList = null;
        this.appFileRegion = null;
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
    functionDefinition.index = this.nextFunctionDefinitionIndex;
    this.nextFunctionDefinitionIndex += 1;
    functionDefinition.assembler = this;
    this.functionDefinitionMap.setIndexDefinition(functionDefinition);
}

Assembler.prototype.extractFunctionDefinitions = function(): void {
    var self = this;
    self.processLines(function(line) {
        var tempDirectiveName = line.directiveName;
        var tempArgList = line.argList;
        if (tempDirectiveName == "PRIV_FUNC") {
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
        if (tempDirectiveName == "PUB_FUNC") {
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
    this.processLines(line => {
        var tempDefinition = variableUtils.extractGlobalVariableDefinition(line);
        if (tempDefinition !== null) {
            this.globalVariableDefinitionMap.setIndexDefinition(tempDefinition);
            return [];
        }
        return null;
    });
    variableUtils.populateVariableDefinitionIndexes(this.globalVariableDefinitionMap);
}

Assembler.prototype.getIndexDefinitionByIdentifier = function(identifier: Identifier): IndexDefinition {
    for (let identifierMap of this.indexDefinitionMapList) {
        let tempDefinition = identifierMap.get(identifier);
        if (tempDefinition !== null) {
            return tempDefinition;
        }
    }
    throw new AssemblyError(`Unknown identifier ${identifier.name}.`);
}

Assembler.prototype.determineIndexDefinitionMapList = function(): void {
    this.indexDefinitionMapList = [
        this.globalVariableDefinitionMap,
        this.appDataLineList.labelDefinitionMap,
        this.functionDefinitionMap
    ];
}


Assembler.prototype.assembleInstructions = function(): void {
    this.functionDefinitionMap.iterate(functionDefinition => {
        functionDefinition.assembleInstructions();
    });
}

Assembler.prototype.generateAppFileRegion = function(): void {
    let funcRegionList = [];
    this.functionDefinitionMap.iterate(functionDefinition => {
        let tempRegion = functionDefinition.createRegion();
        funcRegionList.push(tempRegion);
    });
    let appFuncsRegion = new CompositeRegion(REGION_TYPE.appFuncs, funcRegionList);
    this.appFileRegion = new CompositeRegion(REGION_TYPE.appFile, [
        appFuncsRegion
        // TODO: Add more regions.
        
    ]);
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
    this.globalVariableDefinitionMap.iterate(variableDefinition => {
        tempTextList.push(variableDefinition.getDisplayString());
    });
    tempTextList.push("\n= = = FUNCTION DEFINITIONS = = =\n");
    this.functionDefinitionMap.iterate(functionDefinition => {
        tempTextList.push(functionDefinition.getDisplayString());
        tempTextList.push("");
    });
    tempTextList.push("= = = APP DATA LINE LIST = = =\n");
    tempTextList.push(this.appDataLineList.getDisplayString("Data body"));
    tempTextList.push("\n= = = APP FILE REGION = = =\n");
    tempTextList.push(this.appFileRegion.getDisplayString());
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
        this.determineIndexDefinitionMapList();
        this.assembleInstructions();
        this.generateAppFileRegion();
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
    
    fs.writeFileSync(destinationPath, this.appFileRegion.createBuffer());
    console.log("Finished assembling.");
    console.log("Destination path: " + destinationPath);
}


