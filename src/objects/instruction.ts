
import {Instruction as InstructionInterface} from "models/objects";
import {InstructionType} from "models/delegates";
import {niceUtils} from "utils/niceUtils";

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


