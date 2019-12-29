
import {LineProcessor} from "models/items";
import {
    FunctionDefinition as FunctionDefinitionInterface,
    InterfaceFunctionDefinition as InterfaceFunctionDefinitionInterface,
    PublicFunctionDefinition as PublicFunctionDefinitionInterface,
    Identifier, AssemblyLine, Expression
} from "models/objects";

import {AssemblyError} from "objects/assemblyError";
import {InstructionLineList, JumpTableLineList} from "objects/labeledLineList";
import {Instruction} from "objects/instruction";

import {instructionTypeMap} from "delegates/instructionType";

import {niceUtils} from "utils/niceUtils";
import {variableUtils} from "utils/variableUtils";

export interface FunctionDefinition extends FunctionDefinitionInterface {}

export abstract class FunctionDefinition {
    constructor(identifier: Identifier, lineList: AssemblyLine[]) {
        this.identifier = identifier;
        this.lineList = new InstructionLineList(lineList);
        this.assembler = null;
        this.jumpTableLineList = null;
        this.argVariableDefinitionList = [];
        this.localVariableDefinitionList = [];
        this.instructionList = [];
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
    self.jumpTableLineList = new JumpTableLineList(tempLineList);
}

FunctionDefinition.prototype.getDisplayString = function(): string {
    var tempTextList = [this.getTitle() + ":"];
    tempTextList.push(this.lineList.getDisplayString("Instruction body", 1));
    tempTextList.push(niceUtils.getDisplayableListDisplayString(
        "Assembled instructions",
        this.instructionList,
        1
    ));
    tempTextList.push(this.jumpTableLineList.getDisplayString("Jump table", 1));
    tempTextList.push(niceUtils.getDisplayableListDisplayString(
        "Argument variables",
        this.argVariableDefinitionList,
        1
    ));
    tempTextList.push(niceUtils.getDisplayableListDisplayString(
        "Local variables",
        this.localVariableDefinitionList,
        1
    ));
    return niceUtils.joinTextList(tempTextList);
}

FunctionDefinition.prototype.extractVariableDefinitions = function(): void {
    var self = this;
    self.processLines(function(line) {
        var tempLocalDefinition = variableUtils.extractLocalVariableDefinition(line);
        if (tempLocalDefinition !== null) {
            self.localVariableDefinitionList.push(tempLocalDefinition);
            return [];
        }
        var tempArgDefinition = variableUtils.extractArgVariableDefinition(line);
        if (tempArgDefinition !== null) {
            self.argVariableDefinitionList.push(tempArgDefinition);
            return [];
        }
        return null;
    });
}

FunctionDefinition.prototype.extractLabelDefinitions = function(): void {
    this.lineList.extractLabelDefinitions();
    this.jumpTableLineList.extractLabelDefinitions();
}

FunctionDefinition.prototype.assembleInstructionArgument = function(expression: Expression): Buffer {
    // TODO: Implement.
    
    return Buffer.alloc(0);
}

FunctionDefinition.prototype.assembleInstruction = function(line: AssemblyLine): Instruction {
    let tempName = line.directiveName;
    if (!(tempName in instructionTypeMap)) {
        throw new AssemblyError("Unrecognized opcode mnemonic.");
    }
    let tempInstructionType = instructionTypeMap[tempName];
    let tempAmount = tempInstructionType.argumentAmount;
    if (line.argList.length !== tempAmount) {
        throw new AssemblyError(`Expected ${tempInstructionType.argumentAmount} ${niceUtils.pluralize("argument", tempAmount)}.`);
    }
    var tempArgumentList = line.argList.map(expression => {
        return this.assembleInstructionArgument(expression)
    });
    return new Instruction(tempInstructionType, tempArgumentList);
}

FunctionDefinition.prototype.assembleInstructions = function(): void {
    this.processLines(line => {
        let tempInstruction = this.assembleInstruction(line);
        this.instructionList.push(tempInstruction);
        return null;
    });
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
    constructor(identifier: Identifier, interfaceIndexExpression: Expression, lineList: AssemblyLine[]) {
        super(identifier, lineList);
        this.interfaceIndexExpression = interfaceIndexExpression;
    }
}

InterfaceFunctionDefinition.prototype.getTitle = function(): string {
    return this.getTitlePrefix() + " function " + this.identifier.getDisplayString() + " (" + this.getTitleSuffix() + ")";
}

InterfaceFunctionDefinition.prototype.getTitleSuffix = function(): string {
    return this.interfaceIndexExpression.getDisplayString()
}

export interface PublicFunctionDefinition extends PublicFunctionDefinitionInterface {}

export class PublicFunctionDefinition extends InterfaceFunctionDefinition {
    constructor(
        identifier: Identifier,
        interfaceIndexExpression: Expression,
        arbiterIndexExpression: Expression,
        lineList: AssemblyLine[]
    ) {
        super(identifier, interfaceIndexExpression, lineList);
        this.arbiterIndexExpression = arbiterIndexExpression;
    }
}

PublicFunctionDefinition.prototype.getTitlePrefix = function(): string {
    return "Public";
}

PublicFunctionDefinition.prototype.getTitleSuffix = function(): string {
    var output = InterfaceFunctionDefinition.prototype.getTitleSuffix.call(this);
    if (this.arbiterIndexExpression !== null) {
        output += ", " + this.arbiterIndexExpression.getDisplayString();
    }
    return output;
}

export class GuardFunctionDefinition extends InterfaceFunctionDefinition {
    constructor(identifier: Identifier, interfaceIndexExpression: Expression, lineList: AssemblyLine[]) {
        super(identifier, interfaceIndexExpression, lineList);
    }
}

GuardFunctionDefinition.prototype.getTitlePrefix = function(): string {
    return "Guard";
}


