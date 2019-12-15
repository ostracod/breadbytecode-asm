
import {LineProcessor} from "models/items";
import {
    FunctionDefinition as FunctionDefinitionInterface,
    InterfaceFunctionDefinition as InterfaceFunctionDefinitionInterface,
    Identifier, AssemblyLine, Expression
} from "models/objects";

import {Assembler} from "objects/assembler";
import {AssemblyError} from "objects/assemblyError";

import {lineUtils} from "utils/lineUtils";
import {niceUtils} from "utils/niceUtils";

export interface FunctionDefinition extends FunctionDefinitionInterface {}

export abstract class FunctionDefinition {
    constructor(identifier: Identifier, lineList: AssemblyLine[]) {
        this.identifier = identifier;
        this.lineList = new LabeledLineList(lineList);
        this.jumpTableLineList = null;
        this.argVariableDefinitionList = [];
        this.localVariableDefinitionList = [];
        this.extractJumpTables();
        this.extractVariableDefinitions();
        this.extractLabelDefinitions();
    }
}

FunctionDefinition.prototype.processLines = function(processLine: LineProcessor): void {
    this.lineList.processLines(processLine);
}

FunctionDefinition.prototype.processJumpTableLines = function(processLine: LineProcessor): void {
    this.jumpTableLineList.processLines(processLine);
}

FunctionDefinition.prototype.extractJumpTables = function(): void {
    var tempLineList = [];
    var self = this;
    self.processLines(function(line) {
        if (line.directiveName == "JMP_TABLE") {
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
        return null;
    });
    self.jumpTableLineList = new LabeledLineList(tempLineList);
}

FunctionDefinition.prototype.getDisplayString = function(): string {
    var tempTextList = [this.getTitle() + ":"];
    tempTextList.push(this.lineList.getDisplayString("Instruction body", 1));
    tempTextList.push(this.jumpTableLineList.getDisplayString("Jump table", 1));
    tempTextList.push(niceUtils.getDefinitionListDisplayString(
        "Argument variables",
        this.argVariableDefinitionList,
        1
    ));
    tempTextList.push(niceUtils.getDefinitionListDisplayString(
        "Local variables",
        this.localVariableDefinitionList,
        1
    ));
    return niceUtils.joinTextList(tempTextList);
}

export class PrivateFunctionDefinition extends FunctionDefinition {
    constructor(identifier: Identifier, lineList: AssemblyLine[]) {
        super(identifier, lineList);
    }
}

PrivateFunctionDefinition.prototype.getTitle = function(): string {
    return "Private function " + this.identifier.getDisplayString();
}

export interface InterfaceFunctionDefinition extends InterfaceFunctionDefinitionInterface {}

export abstract class InterfaceFunctionDefinition extends FunctionDefinition {
    constructor(identifier: Identifier, dependencyIndexExpression: Expression, lineList: AssemblyLine[]) {
        super(identifier, lineList);
        this.dependencyIndexExpression = dependencyIndexExpression;
    }
}

InterfaceFunctionDefinition.prototype.getTitle = function(): string {
    return this.getTitlePrefix() + " function " + this.identifier.getDisplayString() + " (" + this.dependencyIndexExpression.getDisplayString() + ")";
}

export class PublicFunctionDefinition extends InterfaceFunctionDefinition {
    constructor(identifier: Identifier, dependencyIndexExpression: Expression, lineList: AssemblyLine[]) {
        super(identifier, dependencyIndexExpression, lineList);
    }
}

PublicFunctionDefinition.prototype.getTitlePrefix = function(): string {
    return "Public";
}

export class GuardFunctionDefinition extends InterfaceFunctionDefinition {
    constructor(identifier: Identifier, dependencyIndexExpression: Expression, lineList: AssemblyLine[]) {
        super(identifier, dependencyIndexExpression, lineList);
    }
}

GuardFunctionDefinition.prototype.getTitlePrefix = function(): string {
    return "Guard";
}

import "objects/variableDefinition";
import "objects/labelDefinition";

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
            self.functionDefinitionList.push(tempPrivateDefinition);
            return [];
        }
        if (tempDirectiveName == "PUBLIC_FUNC") {
            if (tempArgList.length != 2) {
                throw new AssemblyError("Expected 2 arguments.");
            }
            var tempIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempPublicDefinition = new PublicFunctionDefinition(
                tempIdentifier,
                tempArgList[1],
                line.codeBlock
            );
            self.functionDefinitionList.push(tempPublicDefinition);
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
            self.functionDefinitionList.push(tempGuardDefinition);
            return [];
        }
        return null;
    });
}

import {LabeledLineList} from "objects/labeledLineList";


