
import {LineProcessor} from "models/items";
import {
    FunctionDefinition as FunctionDefinitionInterface,
    InterfaceFunctionDefinition as InterfaceFunctionDefinitionInterface,
    PublicFunctionDefinition as PublicFunctionDefinitionInterface,
    Identifier, AssemblyLine, Expression, Region
} from "models/objects";

import {IndexDefinition, indexConstantConverter} from "objects/indexDefinition";
import {AssemblyError} from "objects/assemblyError";
import {InstructionLineList, JumpTableLineList} from "objects/labeledLineList";
import {IdentifierMap} from "objects/identifier";
import {REGION_TYPE, AtomicRegion, CompositeRegion} from "objects/region";

import {niceUtils} from "utils/niceUtils";
import {variableUtils} from "utils/variableUtils";

export interface FunctionDefinition extends FunctionDefinitionInterface {}

export abstract class FunctionDefinition extends IndexDefinition {
    constructor(identifier: Identifier, lineList: AssemblyLine[], regionType: number) {
        super(identifier, indexConstantConverter);
        this.lineList = new InstructionLineList(lineList, this);
        this.regionType = regionType;
        this.assembler = null;
        this.jumpTableLineList = null;
        this.argVariableDefinitionMap = new IdentifierMap();
        this.localVariableDefinitionMap = new IdentifierMap();
        this.instructionList = [];
        this.localFrameLength = null;
        this.argFrameLength = null;
        
        this.extractJumpTables();
        this.extractVariableDefinitions();
        this.extractLabelDefinitions();
        
        this.indexDefinitionMapList = [
            this.localVariableDefinitionMap,
            this.argVariableDefinitionMap,
            this.lineList.labelDefinitionMap,
            this.jumpTableLineList.labelDefinitionMap
        ];
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
    self.jumpTableLineList = new JumpTableLineList(tempLineList, this);
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

FunctionDefinition.prototype.getIndexDefinitionByIdentifier = function(identifier: Identifier): IndexDefinition {
    for (let identifierMap of this.indexDefinitionMapList) {
        let tempDefinition = identifierMap.get(identifier);
        if (tempDefinition !== null) {
            return tempDefinition;
        }
    }
    return this.assembler.getIndexDefinitionByIdentifier(identifier);
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
    let jumpTableRegion = new AtomicRegion(
        REGION_TYPE.jmpTable,
        this.jumpTableLineList.createBuffer()
    );
    let tempRegionList = [
        argFrameLengthRegion,
        localFrameLengthRegion,
        instructionsRegion,
        jumpTableRegion
    ].concat(this.createRegionHelper());
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

export class GuardFunctionDefinition extends InterfaceFunctionDefinition {
    constructor(identifier: Identifier, interfaceIndexExpression: Expression, lineList: AssemblyLine[]) {
        super(identifier, interfaceIndexExpression, lineList, REGION_TYPE.guardFunc);
    }
}

GuardFunctionDefinition.prototype.getTitlePrefix = function(): string {
    return "Guard";
}


