
import {Instruction as InstructionInterface} from "models/objects";
import {InstructionType} from "models/delegates";

import {instructionTypeMap} from "delegates/instructionType";

import {AssemblyError} from "objects/assemblyError";
import {AssemblyLine} from "objects/assemblyLine";
import {FunctionDefinition} from "objects/functionDefinition";
import {Assembler} from "objects/assembler";

export interface Instruction extends InstructionInterface {}

export class Instruction {
    constructor(instructionType: InstructionType) {
        this.instructionType = instructionType;
    }
}

AssemblyLine.prototype.assembleInstruction = function(): Instruction {
    if (!(this.directiveName in instructionTypeMap)) {
        throw new AssemblyError("Unrecognized opcode mnemonic.");
    }
    var tempInstructionType = instructionTypeMap[this.directiveName];
    return new Instruction(tempInstructionType);
}

FunctionDefinition.prototype.assembleInstructions = function(): void {
    this.processLines(line => {
        var tempInstruction = line.assembleInstruction();
        this.instructionList.push(tempInstruction);
        return null;
    });
}

Assembler.prototype.assembleInstructions = function(): void {
    for (let functionDefinition of this.functionDefinitionList) {
        functionDefinition.assembleInstructions();
    }
}


