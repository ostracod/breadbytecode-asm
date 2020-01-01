
import {Instruction as InstructionInterface, InstructionRef as InstructionRefInterface} from "models/objects";
import {InstructionType, DataType} from "models/delegates";
import {niceUtils} from "utils/niceUtils";
import {instructionUtils} from "utils/instructionUtils";

export interface Instruction extends InstructionInterface {}

export class Instruction {
    constructor(instructionType: InstructionType, argList: Buffer[]) {
        this.instructionType = instructionType;
        this.argList = argList;
    }
}

Instruction.prototype.getDisplayString = function(): string {
    let output = niceUtils.convertNumberToHexadecimal(this.instructionType.opcode, 4);
    if (this.argList.length > 0) {
        var tempTextList = [];
        for (let buffer of this.argList) {
            tempTextList.push("{" + niceUtils.convertBufferToHexadecimal(buffer) + "}");
        }
        output += " " + tempTextList.join(", ");
    }
    return output;
}

export interface InstructionRef extends InstructionRefInterface {}

export class InstructionRef {
    constructor(argPrefix: number) {
        this.argPrefix = argPrefix;
    }
}

InstructionRef.prototype.createInstructionArg = function(indexArg: Buffer, dataType: DataType): Buffer {
    return instructionUtils.createInstructionArg(
        this.argPrefix,
        dataType.argPrefix,
        indexArg
    );
}


