
import {Instruction as InstructionInterface} from "models/objects";
import {InstructionType} from "models/delegates";

export interface Instruction extends InstructionInterface {}

export class Instruction {
    constructor(instructionType: InstructionType) {
        this.instructionType = instructionType;
    }
}


