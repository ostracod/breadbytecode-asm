
import {Instruction as InstructionInterface} from "models/objects";
import {InstructionType} from "models/delegates";
import {niceUtils} from "utils/niceUtils";

export interface Instruction extends InstructionInterface {}

export class Instruction {
    constructor(instructionType: InstructionType, argumentList: Buffer[]) {
        this.instructionType = instructionType;
        this.argumentList = argumentList;
    }
}

Instruction.prototype.getDisplayString = function(): string {
    let output = niceUtils.convertNumberToHexadecimal(this.instructionType.opcode, 4);
    if (this.argumentList.length > 0) {
        var tempTextList = [];
        for (let buffer of this.argumentList) {
            tempTextList.push("{" + niceUtils.convertBufferToHexadecimal(buffer) + "}");
        }
        output += " " + tempTextList.join(", ");
    }
    return output;
}


