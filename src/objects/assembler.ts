
import * as fs from "fs";

import {LineProcessor, ExpressionProcessor} from "models/items";
import {
    Assembler as AssemblerInterface,
    BytecodeAppAssembler as BytecodeAppAssemblerInterface,
    InterfaceAssembler as InterfaceAssemblerInterface,
    AssemblyLine, FunctionDefinition, Identifier, IndexDefinition, Region, DependencyDefinition} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {IdentifierMap} from "objects/identifier";
import {Scope} from "objects/scope";
import {MacroDefinition} from "objects/macroDefinition";
import {AliasDefinition} from "objects/aliasDefinition";
import {PrivateFunctionDefinition, PublicFunctionDefinition, GuardFunctionDefinition, InterfaceFunctionDefinition} from "objects/functionDefinition";
import {AppDataLineList} from "objects/labeledLineList";
import {REGION_TYPE, AtomicRegion, CompositeRegion} from "objects/region";
import {PathDependencyDefinition, VersionDependencyDefinition, InterfaceDependencyDefinition} from "objects/dependencyDefinition";

import {parseUtils} from "utils/parseUtils";
import {lineUtils} from "utils/lineUtils";
import {variableUtils} from "utils/variableUtils";
import {dependencyUtils} from "utils/dependencyUtils";

export interface Assembler extends AssemblerInterface {}

export abstract class Assembler {
    constructor(rootRegionType: number, funcsRegionType: number, shouldBeVerbose: boolean) {
        this.rootRegionType = rootRegionType;
        this.funcsRegionType = funcsRegionType;
        this.shouldBeVerbose = shouldBeVerbose;
        this.rootLineList = [];
        this.aliasDefinitionMap = new IdentifierMap();
        this.macroDefinitionMap = {};
        this.functionDefinitionList = [];
        this.dependencyDefinitionMap = new IdentifierMap();
        this.nextMacroInvocationId = 0;
        this.scope = new Scope();
        this.fileFormatVersionNumber = null;
        this.fileRegion = null;
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
    let tempLineTextList = parseUtils.loadAssemblyFileContent(path);
    let tempLineList;
    try {
        tempLineList = parseUtils.parseAssemblyLines(tempLineTextList);
        for (let line of tempLineList) {
            line.filePath = path;
        }
        tempLineList = parseUtils.collapseCodeBlocks(tempLineList);
    } catch(error) {
        if (error instanceof AssemblyError) {
            error.filePath = path;
        }
        throw error;
    }
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

Assembler.prototype.populateScopeInRootLines = function(): void {
    this.processExpressionsInLines(expression => {
        expression.scope = this.scope;
        return null;
    });
}

Assembler.prototype.addFunctionDefinition = function(functionDefinition: FunctionDefinition): void {
    functionDefinition.index = this.functionDefinitionList.length;
    functionDefinition.populateScope(this.scope);
    functionDefinition.extractDefinitions();
    functionDefinition.populateScopeDefinitions();
    this.functionDefinitionList.push(functionDefinition);
}

Assembler.prototype.addDependencyDefinition = function(dependencyDefinition: DependencyDefinition): void {
    dependencyDefinition.index = this.dependencyDefinitionMap.getSize();
    this.dependencyDefinitionMap.setIndexDefinition(dependencyDefinition);
}

Assembler.prototype.extractDependencyDefinitions = function(): void {
    this.processLines(line => {
        let tempDirectiveName = line.directiveName;
        let tempArgList = line.argList;
        if (tempDirectiveName == "PATH_DEP") {
            let tempResult = dependencyUtils.evaluateDependencyArgs(tempArgList, 2);
            let tempDefinition = new PathDependencyDefinition(
                tempResult.identifier,
                tempResult.path,
                tempResult.dependencyModifierList
            );
            this.addDependencyDefinition(tempDefinition);
            return [];
        }
        if (tempDirectiveName == "VER_DEP") {
            let tempResult = dependencyUtils.evaluateDependencyArgs(tempArgList, 3);
            let tempVersionNumber = tempArgList[2].evaluateToVersionNumber();
            let tempDefinition = new VersionDependencyDefinition(
                tempResult.identifier,
                tempResult.path,
                tempVersionNumber,
                tempResult.dependencyModifierList
            );
            this.addDependencyDefinition(tempDefinition);
            return [];
        }
        if (tempDirectiveName == "IFACE_DEP") {
            let tempDependencyExpressionList = [];
            let index = 2;
            while (index < tempArgList.length) {
                let tempExpression = tempArgList[index];
                let tempResult = tempExpression.evaluateToDependencyModifierOrNull();
                if (tempResult !== null) {
                    break;
                }
                tempDependencyExpressionList.push(tempExpression);
                index += 1;
            }
            let tempResult = dependencyUtils.evaluateDependencyArgs(tempArgList, index);
            let tempDefinition = new InterfaceDependencyDefinition(
                tempResult.identifier,
                tempResult.path,
                tempDependencyExpressionList,
                tempResult.dependencyModifierList
            );
            this.addDependencyDefinition(tempDefinition);
            return [];
        }
        return null;
    });
}

Assembler.prototype.extractFileFormatVersionNumber = function(): void {
    this.processLines(line => {
        let tempArgList = line.argList;
        if (line.directiveName == "FORMAT_VER") {
            if (tempArgList.length !== 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            if (this.fileFormatVersionNumber !== null) {
                throw new AssemblyError("Extra bytecode version directive.");
            }
            this.fileFormatVersionNumber = tempArgList[0].evaluateToVersionNumber();
            return [];
        }
        return null;
    });
    if (this.fileFormatVersionNumber === null) {
        throw new AssemblyError("Missing FORMAT_VER directive.");
    }
}

Assembler.prototype.extractDefinitions = function(): void {
    this.extractFunctionDefinitions();
    this.extractDependencyDefinitions();
    this.extractFileFormatVersionNumber();
}

Assembler.prototype.populateScopeDefinitions = function(): void {
    this.scope.indexDefinitionMapList = [this.dependencyDefinitionMap];
}

Assembler.prototype.createFileSubregions = function(): Region[] {
    let formatVersionRegion = new AtomicRegion(
        REGION_TYPE.fileFormatVer,
        this.fileFormatVersionNumber.createBuffer()
    );
    let funcRegionList = [];
    for (let functionDefinition of this.functionDefinitionList) {
        let tempRegion = functionDefinition.createRegion();
        funcRegionList.push(tempRegion);
    };
    let appFuncsRegion = new CompositeRegion(this.funcsRegionType, funcRegionList);
    let dependencyRegionList = [];
    this.dependencyDefinitionMap.iterate(dependencyDefinition => {
        let tempRegion = dependencyDefinition.createRegion();
        dependencyRegionList.push(tempRegion);
    });
    let output = [
        formatVersionRegion,
        appFuncsRegion
    ];
    if (dependencyRegionList.length > 0) {
        output.push(new CompositeRegion(REGION_TYPE.deps, dependencyRegionList));
    }
    return output;
}

Assembler.prototype.generateFileRegion = function(): void {
    if (this.rootLineList.length > 0) {
        let tempLine = this.rootLineList[0];
        throw new AssemblyError(
            "Unknown directive.",
            tempLine.lineNumber,
            tempLine.filePath
        );
    }
    let tempRegionList = this.createFileSubregions();
    this.fileRegion = new CompositeRegion(this.rootRegionType, tempRegionList);
}

Assembler.prototype.getDisplayString = function(): string {
    var tempTextList = [];
    tempTextList.push("\n= = = FILE FORMAT VERSION = = =\n");
    tempTextList.push(this.fileFormatVersionNumber.getDisplayString());
    tempTextList.push("\n= = = DEPENDENCY DEFINITIONS = = =\n");
    this.dependencyDefinitionMap.iterate(dependencyDefinition => {
        tempTextList.push(dependencyDefinition.getDisplayString());
    });
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
    tempTextList.push("= = = FUNCTION DEFINITIONS = = =\n");
    for (let functionDefinition of this.functionDefinitionList) {
        tempTextList.push(functionDefinition.getDisplayString());
        tempTextList.push("");
    };
    tempTextList.push("= = = APP FILE REGION = = =\n");
    tempTextList.push(this.fileRegion.getDisplayString());
    tempTextList.push("");
    return tempTextList.join("\n");
}

Assembler.prototype.assembleCodeFile = function(sourcePath: string, destinationPath: string): void {
    
    console.log(`Assembling "${sourcePath}"...`);
    
    try {
        this.rootLineList = this.loadAndParseAssemblyFile(sourcePath);
        this.expandAliasInvocations();
        this.populateScopeInRootLines();
        this.extractDefinitions();
        this.populateScopeDefinitions();
        this.generateFileRegion();
    } catch(error) {
        if (error instanceof AssemblyError) {
            if (error.lineNumber === null || error.filePath === null) {
                console.log("Error: " + error.message);
            } else {
                console.log(`Error in "${error.filePath}" on line ${error.lineNumber}: ${error.message}`);
            }
            return;
        } else {
            throw error;
        }
    }
    
    if (this.shouldBeVerbose) {
        console.log(this.getDisplayString());
    }
    
    fs.writeFileSync(destinationPath, this.fileRegion.createBuffer());
    console.log("Finished assembling.");
    console.log(`Destination path: "${destinationPath}"`);
}

export interface BytecodeAppAssembler extends BytecodeAppAssemblerInterface {}

export class BytecodeAppAssembler extends Assembler {
    constructor(shouldBeVerbose: boolean) {
        super(REGION_TYPE.appFile, REGION_TYPE.appFuncs, shouldBeVerbose);
        this.privateFunctionDefinitionMap = new IdentifierMap();
        this.publicFunctionDefinitionList = [];
        this.appDataLineList = null;
        this.globalVariableDefinitionMap = new IdentifierMap();
        this.globalFrameLength = null;
    }
}

BytecodeAppAssembler.prototype.getDisplayString = function(): string {
    var tempTextList = [];
    tempTextList.push("\n= = = GLOBAL VARIABLE DEFINITIONS = = =\n");
    this.globalVariableDefinitionMap.iterate(variableDefinition => {
        tempTextList.push(variableDefinition.getDisplayString());
    });
    tempTextList.push("\n= = = APP DATA LINE LIST = = =\n");
    tempTextList.push(this.appDataLineList.getDisplayString("Data body"));
    tempTextList.push(Assembler.prototype.getDisplayString.call(this));
    return tempTextList.join("\n");
}

BytecodeAppAssembler.prototype.extractDefinitions = function(): void {
    Assembler.prototype.extractDefinitions.call(this);
    this.extractAppDataDefinitions();
    this.extractGlobalVariableDefinitions();
}

BytecodeAppAssembler.prototype.populateScopeDefinitions = function(): void {
    Assembler.prototype.populateScopeDefinitions.call(this);
    this.scope.indexDefinitionMapList.push(
        this.globalVariableDefinitionMap,
        this.appDataLineList.labelDefinitionMap,
        this.privateFunctionDefinitionMap
    );
    this.scope.publicFunctionDefinitionList = this.publicFunctionDefinitionList;
}

BytecodeAppAssembler.prototype.createFileSubregions = function(): Region[] {
    let output = Assembler.prototype.createFileSubregions.call(this);
    let globalFrameLengthRegion = new AtomicRegion(
        REGION_TYPE.globalFrameLen,
        this.globalFrameLength.createBuffer()
    );
    output.push(globalFrameLengthRegion);
    let tempBuffer = this.appDataLineList.createBuffer();
    if (tempBuffer.length > 0) {
        let appDataRegion = new AtomicRegion(
            REGION_TYPE.appData,
            tempBuffer
        );
        output.push(appDataRegion);
    }
    return output;
}

BytecodeAppAssembler.prototype.extractFunctionDefinitions = function(): void {
    this.processLines(line => {
        let tempDirectiveName = line.directiveName;
        let tempArgList = line.argList;
        if (tempDirectiveName == "PRIV_FUNC") {
            if (tempArgList.length != 1) {
                throw new AssemblyError("Expected 1 argument.");
            }
            let tempIdentifier = tempArgList[0].evaluateToIdentifier();
            let tempDefinition = new PrivateFunctionDefinition(
                tempIdentifier,
                line.codeBlock
            );
            this.addFunctionDefinition(tempDefinition);
            this.privateFunctionDefinitionMap.setIndexDefinition(tempDefinition);
            return [];
        }
        if (tempDirectiveName == "PUB_FUNC") {
            let tempArbiterIndexExpression;
            if (tempArgList.length == 3) {
                tempArbiterIndexExpression = tempArgList[2];
            } else if (tempArgList.length == 2) {
                tempArbiterIndexExpression = null;
            } else {
                throw new AssemblyError("Expected 2 or 3 arguments.");
            }
            let tempIdentifier = tempArgList[0].evaluateToIdentifier();
            let tempDefinition = new PublicFunctionDefinition(
                tempIdentifier,
                tempArgList[1],
                tempArbiterIndexExpression,
                line.codeBlock
            );
            this.addFunctionDefinition(tempDefinition);
            this.publicFunctionDefinitionList.push(tempDefinition);
            return [];
        }
        if (tempDirectiveName == "GUARD_FUNC") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            let tempIdentifier = tempArgList[0].evaluateToIdentifier();
            let tempDefinition = new GuardFunctionDefinition(
                tempIdentifier,
                tempArgList[1],
                line.codeBlock
            );
            this.addFunctionDefinition(tempDefinition);
            return [];
        }
        return null;
    });
}

BytecodeAppAssembler.prototype.extractAppDataDefinitions = function(): void {
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
    self.appDataLineList = new AppDataLineList(tempLineList, this.scope);
    self.appDataLineList.extractLabelDefinitions();
}

BytecodeAppAssembler.prototype.extractGlobalVariableDefinitions = function(): void {
    this.processLines(line => {
        var tempDefinition = variableUtils.extractGlobalVariableDefinition(line);
        if (tempDefinition !== null) {
            this.globalVariableDefinitionMap.setIndexDefinition(tempDefinition);
            return [];
        }
        return null;
    });
    this.globalFrameLength = variableUtils.populateVariableDefinitionIndexes(
        this.globalVariableDefinitionMap
    );
}

export interface InterfaceAssembler extends InterfaceAssemblerInterface {}

export class InterfaceAssembler extends Assembler {
    constructor(shouldBeVerbose: boolean) {
        super(REGION_TYPE.ifaceFile, REGION_TYPE.ifaceFuncs, shouldBeVerbose);
    }
}

InterfaceAssembler.prototype.extractFunctionDefinitions = function(): void {
    this.processLines(line => {
        let tempArgList = line.argList;
        if (line.directiveName == "IFACE_FUNC") {
            let tempArbiterIndexExpression;
            if (tempArgList.length == 2) {
                tempArbiterIndexExpression = tempArgList[1];
            } else if (tempArgList.length == 1) {
                tempArbiterIndexExpression = null;
            } else {
                throw new AssemblyError("Expected 1 or 2 arguments.");
            }
            let tempIdentifier = tempArgList[0].evaluateToIdentifier();
            let tempDefinition = new InterfaceFunctionDefinition(
                tempIdentifier,
                tempArbiterIndexExpression,
                line.codeBlock
            );
            this.addFunctionDefinition(tempDefinition);
            return [];
        }
        return null;
    });
}


