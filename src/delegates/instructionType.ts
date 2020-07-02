
import * as fs from "fs";
import * as pathUtils from "path";

import {InstructionType as InstructionTypeInterface} from "models/delegates";

export interface InstructionType extends InstructionTypeInterface {}

export var instructionTypeMap: {[name: string]: InstructionType} = {};

export class InstructionType {
    
    constructor(name: string, opcode: number, argAmount: number) {
        this.name = name;
        this.opcode = opcode;
        this.argAmount = argAmount;
        instructionTypeMap[this.name] = this;
    }
}

const instructionsPath = pathUtils.join(
    __dirname,
    "../../../breadsystem-spec/bytecodeInstructions.json"
);
let categoryJsonList = JSON.parse(fs.readFileSync(instructionsPath, "utf8"));

var tempCount = 0;
for (let categoryJson of categoryJsonList) {
    for (let instructionJson of categoryJson.instructionList) {
        tempCount += 1;
        new InstructionType(
            instructionJson.name,
            instructionJson.opcode,
            instructionJson.argumentList.length
        );
    }
}


