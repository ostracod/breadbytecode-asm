
import {
    Instruction as InstructionInterface,
    InstructionRef as InstructionRefInterface,
    PointerInstructionRef as PointerInstructionRefInterface,
    InstructionArg as InstructionArgInterface,
    ConstantInstructionArg as ConstantInstructionArgInterface,
    RefInstructionArg as RefInstructionArgInterface,
    Constant
} from "models/objects";
import {InstructionType, DataType} from "models/delegates";
import {mathUtils} from "utils/mathUtils";
import {instructionUtils} from "utils/instructionUtils";

export const INSTRUCTION_REF_PREFIX = {
    constant: 0,
    globalFrame: 1,
    localFrame: 2,
    prevArgFrame: 3,
    nextArgFrame: 4,
    appData: 5,
    heapAlloc: 6
};

export interface Instruction extends InstructionInterface {}

export class Instruction {
    
    constructor(instructionType: InstructionType, argList: InstructionArg[]) {
        this.instructionType = instructionType;
        this.argList = argList;
    }
    
    getDisplayString(): string {
        let output = mathUtils.convertNumberToHexadecimal(this.instructionType.opcode, 4);
        if (this.argList.length > 0) {
            var tempTextList = [];
            for (let arg of this.argList) {
                tempTextList.push(arg.getDisplayString());
            }
            output += " " + tempTextList.join(", ");
        }
        return output;
    }
    
    createBuffer(): Buffer {
        let tempBuffer = Buffer.alloc(3);
        tempBuffer.writeUInt16LE(this.instructionType.opcode, 0);
        tempBuffer.writeUInt8(this.argList.length, 2);
        let tempBufferList = [tempBuffer].concat(
            this.argList.map(arg => arg.createBuffer())
        );
        return Buffer.concat(tempBufferList);
    }
}

export interface InstructionRef extends InstructionRefInterface {}

export class InstructionRef {
    
    constructor(argPrefix: number) {
        this.argPrefix = argPrefix;
    }
    
    createBuffer(dataType: DataType, indexArg: InstructionArg): Buffer {
        return instructionUtils.createArgBuffer(
            this.argPrefix,
            dataType,
            indexArg.createBuffer()
        );
    }
}

export interface PointerInstructionRef extends PointerInstructionRefInterface {}

export class PointerInstructionRef extends InstructionRef {
    
    constructor(pointerArg: InstructionArg) {
        super(INSTRUCTION_REF_PREFIX.heapAlloc);
        this.pointerArg = pointerArg;
    }
    
    createBuffer(dataType: DataType, indexArg: InstructionArg): Buffer {
        return instructionUtils.createArgBuffer(
            this.argPrefix,
            dataType,
            Buffer.concat([this.pointerArg.createBuffer(), indexArg.createBuffer()])
        );
    }
}

export interface InstructionArg extends InstructionArgInterface {}

export class InstructionArg {
    
    constructor() {
        // Do nothing.
        
    }
    
    getDisplayString(): string {
        let tempBuffer = this.createBuffer();
        return "{" + mathUtils.convertBufferToHexadecimal(tempBuffer) + "}";
    }
}

export interface ConstantInstructionArg extends ConstantInstructionArgInterface {}

export class ConstantInstructionArg extends InstructionArg {
    
    constructor(constant: Constant) {
        super();
        this.constant = constant.copy();
    }
    
    getDataType(): DataType {
        return this.constant.getDataType();
    }
    
    setDataType(dataType: DataType): void {
        this.constant.setDataType(dataType);
    }
    
    createBuffer(): Buffer {
        return instructionUtils.createArgBuffer(
            INSTRUCTION_REF_PREFIX.constant,
            this.constant.getDataType(),
            this.constant.createBuffer()
        );
    }
}

export interface RefInstructionArg extends RefInstructionArgInterface {}

export class RefInstructionArg extends InstructionArg {
    
    constructor(
        instructionRef: InstructionRef,
        dataType: DataType,
        indexArg: InstructionArg
    ) {
        super();
        this.instructionRef = instructionRef;
        this.dataType = dataType;
        this.indexArg = indexArg;
    }
    
    getDataType(): DataType {
        return this.dataType;
    }
    
    setDataType(dataType: DataType): void {
        this.dataType = dataType;
    }
    
    createBuffer(): Buffer {
        return this.instructionRef.createBuffer(this.dataType, this.indexArg);
    }
}

export const nameInstructionRefMap = {
    globalFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.globalFrame),
    localFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.localFrame),
    prevArgFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.prevArgFrame),
    nextArgFrame: new InstructionRef(INSTRUCTION_REF_PREFIX.nextArgFrame),
    appData: new InstructionRef(INSTRUCTION_REF_PREFIX.appData)
};


