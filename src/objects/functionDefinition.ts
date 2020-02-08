
import {LineProcessor} from "models/items";
import {
    FunctionDefinition as FunctionDefinitionInterface,
    InterfaceFunctionDefinition as InterfaceFunctionDefinitionInterface,
    PublicFunctionDefinition as PublicFunctionDefinitionInterface,
    Identifier, AssemblyLine, Expression, Region
} from "models/objects";

import {niceUtils} from "utils/niceUtils";
import {variableUtils} from "utils/variableUtils";

import {PointerType} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";
import {IndexDefinition, indexConstantConverter} from "objects/indexDefinition";
import {Scope} from "objects/scope";
import {InstructionLineList, JumpTableLineList} from "objects/labeledLineList";
import {IdentifierMap} from "objects/identifier";
import {REGION_TYPE, AtomicRegion, CompositeRegion} from "objects/region";

export interface FunctionDefinition extends FunctionDefinitionInterface {}

export abstract class FunctionDefinition extends IndexDefinition {
    constructor(identifier: Identifier, lineList: AssemblyLine[], regionType: number) {
        super(identifier, indexConstantConverter);
        this.lineList = new InstructionLineList(lineList);
        this.regionType = regionType;
        this.jumpTableLineList = null;
        this.argVariableDefinitionMap = new IdentifierMap();
        this.localVariableDefinitionMap = new IdentifierMap();
        this.instructionList = [];
        this.scope = null;
        this.localFrameLength = null;
        this.argFrameLength = null;
    }
}

FunctionDefinition.prototype.populateScope = function(parentScope: Scope): void {
    this.scope = new Scope(parentScope);
    this.lineList.populateScope(this.scope);
}

FunctionDefinition.prototype.extractDefinitions = function(): void {
    this.extractJumpTables();
    this.extractVariableDefinitions();
    this.extractLabelDefinitions();
    this.populateScopeDefinitions();
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
    self.jumpTableLineList = new JumpTableLineList(tempLineList, this.scope);
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
    tempTextList.push(niceUtils.getIdentifierMapDisplayString(
        "Argument variables",
        this.argVariableDefinitionMap,
        1
    ));
    tempTextList.push(niceUtils.getIdentifierMapDisplayString(
        "Local variables",
        this.localVariableDefinitionMap,
        1
    ));
    return niceUtils.joinTextList(tempTextList);
}

FunctionDefinition.prototype.extractVariableDefinitions = function(): void {
    this.processLines(line => {
        var tempLocalDefinition = variableUtils.extractLocalVariableDefinition(line);
        if (tempLocalDefinition !== null) {
            this.localVariableDefinitionMap.setIndexDefinition(tempLocalDefinition);
            return [];
        }
        var tempArgDefinition = variableUtils.extractArgVariableDefinition(line);
        if (tempArgDefinition !== null) {
            this.argVariableDefinitionMap.setIndexDefinition(tempArgDefinition);
            return [];
        }
        return null;
    });
    this.localFrameLength = variableUtils.populateVariableDefinitionIndexes(
        this.localVariableDefinitionMap
    );
    this.argFrameLength = variableUtils.populateVariableDefinitionIndexes(
        this.argVariableDefinitionMap
    );
}

FunctionDefinition.prototype.extractLabelDefinitions = function(): void {
    this.lineList.extractLabelDefinitions();
    this.jumpTableLineList.extractLabelDefinitions();
}

FunctionDefinition.prototype.populateScopeDefinitions = function(): void {
    this.scope.indexDefinitionMapList = [
        this.localVariableDefinitionMap,
        this.argVariableDefinitionMap,
        this.lineList.labelDefinitionMap,
        this.jumpTableLineList.labelDefinitionMap
    ];
}

FunctionDefinition.prototype.assembleInstructions = function(): void {
    this.instructionList = this.lineList.assembleInstructions();
}

FunctionDefinition.prototype.createRegion = function(): Region {
    let argFrameLengthRegion = new AtomicRegion(
        REGION_TYPE.argFrameLen,
        this.argFrameLength.createBuffer()
    );
    let localFrameLengthRegion = new AtomicRegion(
        REGION_TYPE.localFrameLen,
        this.localFrameLength.createBuffer()
    );
    let tempBuffer = Buffer.concat(
        this.instructionList.map(instruction => instruction.createBuffer())
    );
    let instructionsRegion = new AtomicRegion(REGION_TYPE.instrs, tempBuffer);
    let tempRegionList = [
        argFrameLengthRegion,
        localFrameLengthRegion,
        instructionsRegion
    ].concat(this.createRegionHelper());
    tempBuffer = this.jumpTableLineList.createBuffer();
    if (tempBuffer.length > 0) {
        tempRegionList.push(new AtomicRegion(REGION_TYPE.jmpTable, tempBuffer));
    }
    return new CompositeRegion(this.regionType, tempRegionList);
}

FunctionDefinition.prototype.createRegionHelper = function(): Region[] {
    return [];
}

export class PrivateFunctionDefinition extends FunctionDefinition {
    constructor(identifier: Identifier, lineList: AssemblyLine[]) {
        super(identifier, lineList, REGION_TYPE.privFunc);
    }
}

PrivateFunctionDefinition.prototype.getTitle = function(): string {
    return "Private function " + this.identifier.getDisplayString();
}

export interface InterfaceFunctionDefinition extends InterfaceFunctionDefinitionInterface {}

export abstract class InterfaceFunctionDefinition extends FunctionDefinition {
    constructor(identifier: Identifier, interfaceIndexExpression: Expression, lineList: AssemblyLine[], regionType: number) {
        super(identifier, lineList, regionType);
        this.interfaceIndexExpression = interfaceIndexExpression;
    }
}

InterfaceFunctionDefinition.prototype.getTitle = function(): string {
    return this.getTitlePrefix() + " function " + this.identifier.getDisplayString() + " (" + this.getTitleSuffix() + ")";
}

InterfaceFunctionDefinition.prototype.getTitleSuffix = function(): string {
    return this.interfaceIndexExpression.getDisplayString()
}

InterfaceFunctionDefinition.prototype.createRegionHelper = function(): Region[] {
    let nameRegion = new AtomicRegion(REGION_TYPE.name, Buffer.from(this.identifier.name));
    let argPermsRegion = this.getArgPermsRegion();
    let output = [nameRegion];
    if (argPermsRegion !== null) {
        output.push(argPermsRegion);
    }
    return output;
}

InterfaceFunctionDefinition.prototype.getArgPermsRegion = function(): Region {
    let bufferList = [];
    this.argVariableDefinitionMap.iterate(definition => {
        if (!(definition.dataType instanceof PointerType)) {
            return;
        }
        for (let argPerm of definition.permList) {
            bufferList.push(argPerm.createBuffer(definition.index));
        }
    });
    if (bufferList.length <= 0) {
        return null;
    }
    return new AtomicRegion(REGION_TYPE.argPerms, Buffer.concat(bufferList));
}

export interface PublicFunctionDefinition extends PublicFunctionDefinitionInterface {}

export class PublicFunctionDefinition extends InterfaceFunctionDefinition {
    constructor(
        identifier: Identifier,
        interfaceIndexExpression: Expression,
        arbiterIndexExpression: Expression,
        lineList: AssemblyLine[]
    ) {
        super(identifier, interfaceIndexExpression, lineList, REGION_TYPE.pubFunc);
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

PublicFunctionDefinition.prototype.createRegionHelper = function(): Region[] {
    let output = InterfaceFunctionDefinition.prototype.createRegionHelper.call(this);
    let tempBuffer = Buffer.alloc(8);
    tempBuffer.writeUInt32LE(this.interfaceIndexExpression.evaluateToNumber(), 0);
    let tempNumber;
    if (this.arbiterIndexExpression === null) {
        tempNumber = -1;
    } else {
        tempNumber = this.arbiterIndexExpression.evaluateToNumber();
    }
    tempBuffer.writeInt32LE(tempNumber, 4);
    output.push(new AtomicRegion(REGION_TYPE.pubFuncAttrs, tempBuffer));
    return output;
}

export class GuardFunctionDefinition extends InterfaceFunctionDefinition {
    constructor(identifier: Identifier, interfaceIndexExpression: Expression, lineList: AssemblyLine[]) {
        super(identifier, interfaceIndexExpression, lineList, REGION_TYPE.guardFunc);
    }
}

GuardFunctionDefinition.prototype.getTitlePrefix = function(): string {
    return "Guard";
}

GuardFunctionDefinition.prototype.createRegionHelper = function(): Region[] {
    let output = InterfaceFunctionDefinition.prototype.createRegionHelper.call(this);
    let tempBuffer = Buffer.alloc(4);
    tempBuffer.writeUInt32LE(this.interfaceIndexExpression.evaluateToNumber(), 0);
    output.push(new AtomicRegion(REGION_TYPE.guardFuncAttrs, tempBuffer));
    return output;
}


