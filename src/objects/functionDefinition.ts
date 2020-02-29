
import {LineProcessor} from "models/items";
import {
    FunctionImplementation as FunctionImplementationInterface,
    FunctionDefinition as FunctionDefinitionInterface,
    PrivateFunctionDefinition as PrivateFunctionDefinitionInterface,
    ArgPermFunctionDefinition as ArgPermFunctionDefinitionInterface,
    PublicFunctionDefinition as PublicFunctionDefinitionInterface,
    GuardFunctionDefinition as GuardFunctionDefinitionInterface,
    InterfaceFunctionDefinition as InterfaceFunctionDefinitionInterface,
    AssemblyLine, Expression, Region, LabeledLineList
} from "models/objects";

import {niceUtils} from "utils/niceUtils";
import {variableUtils} from "utils/variableUtils";
import {descriptionUtils} from "utils/descriptionUtils";

import {PointerType} from "delegates/dataType";

import {AssemblyError} from "objects/assemblyError";
import {IndexDefinition, indexConstantConverter} from "objects/indexDefinition";
import {Scope} from "objects/scope";
import {InstructionLineList, JumpTableLineList} from "objects/labeledLineList";
import {Identifier, IdentifierMap} from "objects/identifier";
import {REGION_TYPE, AtomicRegion, CompositeRegion} from "objects/region";

export interface FunctionImplementation extends FunctionImplementationInterface {}

export class FunctionImplementation {
    constructor(functionDefinition: FunctionDefinition) {
        this.functionDefinition = functionDefinition;
        this.localVariableDefinitionMap = new IdentifierMap();
        this.localFrameLength = null;
        this.instructionList = [];
        this.jumpTableLineList = null;
    }
}

FunctionImplementation.prototype.getDisplayString = function(indentationLevel: number): string {
    let tempTextList = [];
    tempTextList.push(this.getLineList().getDisplayString(
        "Instruction body",
        indentationLevel
    ));
    tempTextList.push(niceUtils.getDisplayableListDisplayString(
        "Assembled instructions",
        this.instructionList,
        indentationLevel
    ));
    tempTextList.push(this.jumpTableLineList.getDisplayString(
        "Jump table",
        indentationLevel
    ));
    tempTextList.push(niceUtils.getIdentifierMapDisplayString(
        "Local variables",
        this.localVariableDefinitionMap,
        indentationLevel
    ));
    return niceUtils.joinTextList(tempTextList);
}

FunctionImplementation.prototype.getScope = function(): Scope {
    return this.functionDefinition.scope;
}

FunctionImplementation.prototype.getLineList = function(): LabeledLineList {
    return this.functionDefinition.lineList;
}

FunctionImplementation.prototype.processLines = function(processLine: LineProcessor): void {
    this.functionDefinition.processLines(processLine);
}

FunctionImplementation.prototype.extractDefinitions = function(): void {
    this.extractJumpTables();
    this.extractLocalVariableDefinitions();
    this.extractLabelDefinitions();
}

FunctionImplementation.prototype.extractJumpTables = function(): void {
    let tempLineList = [];
    this.processLines(line => {
        if (line.directiveName === "JMP_TABLE") {
            if (line.argList.length !== 0) {
                throw new AssemblyError("Expected 0 arguments.");
            }
            for (let tempLine of line.codeBlock) {
                tempLineList.push(tempLine);
            }
            return [];
        }
        return null;
    });
    this.jumpTableLineList = new JumpTableLineList(tempLineList, this.getScope());
}

FunctionImplementation.prototype.extractLocalVariableDefinitions = function(): void {
    this.processLines(line => {
        let tempLocalDefinition = variableUtils.extractLocalVariableDefinition(line);
        if (tempLocalDefinition !== null) {
            this.localVariableDefinitionMap.setIndexDefinition(tempLocalDefinition);
            return [];
        }
        return null;
    });
    this.localFrameLength = variableUtils.populateVariableDefinitionIndexes(
        this.localVariableDefinitionMap
    );
}

FunctionImplementation.prototype.extractLabelDefinitions = function(): void {
    this.getLineList().extractLabelDefinitions();
    this.jumpTableLineList.extractLabelDefinitions();
}

FunctionImplementation.prototype.populateScopeDefinitions = function(): void {
    this.getScope().indexDefinitionMapList.push(
        this.localVariableDefinitionMap,
        this.getLineList().labelDefinitionMap,
        this.jumpTableLineList.labelDefinitionMap
    );
}

FunctionImplementation.prototype.assembleInstructions = function(): void {
    this.instructionList = this.getLineList().assembleInstructions();
}

FunctionImplementation.prototype.createSubregions = function(): Region[] {
    let localFrameLengthRegion = new AtomicRegion(
        REGION_TYPE.localFrameLen,
        this.localFrameLength.createBuffer()
    );
    let tempBuffer = Buffer.concat(
        this.instructionList.map(instruction => instruction.createBuffer())
    );
    let instructionsRegion = new AtomicRegion(REGION_TYPE.instrs, tempBuffer);
    let output = [localFrameLengthRegion, instructionsRegion];
    tempBuffer = this.jumpTableLineList.createBuffer();
    if (tempBuffer.length > 0) {
        output.push(new AtomicRegion(REGION_TYPE.jmpTable, tempBuffer));
    }
    return output;
}

export interface FunctionDefinition extends FunctionDefinitionInterface {}

export abstract class FunctionDefinition extends IndexDefinition {
    constructor(identifier: Identifier, lineList: AssemblyLine[], regionType: number) {
        super(identifier, indexConstantConverter);
        this.lineList = new InstructionLineList(lineList);
        this.regionType = regionType;
        this.argVariableDefinitionMap = new IdentifierMap();
        this.argFrameLength = null;
        this.descriptionLineList = [];
        this.scope = null;
        this.functionImplementation = null;
    }
}

FunctionDefinition.prototype.processLines = function(processLine: LineProcessor): void {
    this.lineList.processLines(processLine);
}

FunctionDefinition.prototype.populateScope = function(parentScope: Scope): void {
    this.scope = new Scope(parentScope);
    this.lineList.populateScope(this.scope);
}

FunctionDefinition.prototype.extractDefinitions = function(): void {
    this.extractArgVariableDefinitions();
    this.extractDescriptionLines();
    if (this.functionImplementation !== null) {
        this.functionImplementation.extractDefinitions();
    }
}

FunctionDefinition.prototype.getDisplayString = function(): string {
    let tempTitle = this.getTitlePrefix() + " function " + this.identifier.name;
    let tempSuffix = this.getTitleSuffix();
    if (tempSuffix !== null) {
        tempTitle += ` (${tempSuffix})`;
    }
    var tempTextList = [tempTitle + ":"];
    if (this.functionImplementation !== null) {
        tempTextList.push(this.functionImplementation.getDisplayString(1));
    }
    tempTextList.push(niceUtils.getIdentifierMapDisplayString(
        "Argument variables",
        this.argVariableDefinitionMap,
        1
    ));
    tempTextList.push(niceUtils.getTextListDisplayString(
        "Description",
        this.descriptionLineList,
        1
    ));
    return niceUtils.joinTextList(tempTextList);
}

FunctionDefinition.prototype.extractArgVariableDefinitions = function(): void {
    this.processLines(line => {
        let tempArgDefinition = variableUtils.extractArgVariableDefinition(line);
        if (tempArgDefinition !== null) {
            this.argVariableDefinitionMap.setIndexDefinition(tempArgDefinition);
            return [];
        }
        return null;
    });
    this.argFrameLength = variableUtils.populateVariableDefinitionIndexes(
        this.argVariableDefinitionMap
    );
}

FunctionDefinition.prototype.extractDescriptionLines = function(): void {
    this.processLines(line => {
        let tempText = descriptionUtils.extractDescriptionLine(line);
        if (tempText !== null) {
            this.descriptionLineList.push(tempText);
            return [];
        }
        return null;
    });
}

FunctionDefinition.prototype.populateScopeDefinitions = function(): void {
    this.scope.indexDefinitionMapList = [this.argVariableDefinitionMap];
    if (this.functionImplementation !== null) {
        this.functionImplementation.populateScopeDefinitions();
    }
}

FunctionDefinition.prototype.createRegion = function(): Region {
    if (this.functionImplementation === null) {
        let tempLineList = this.lineList.lineList;
        if (tempLineList.length > 0) {
            let tempLine = tempLineList[0];
            throw new AssemblyError(
                "Unknown directive.",
                tempLine.lineNumber,
                tempLine.filePath
            );
        }
    } else {
        this.functionImplementation.assembleInstructions();
    }
    let tempRegionList = this.createSubregions();
    return new CompositeRegion(this.regionType, tempRegionList);
}

FunctionDefinition.prototype.createSubregions = function(): Region[] {
    let argFrameLengthRegion = new AtomicRegion(
        REGION_TYPE.argFrameLen,
        this.argFrameLength.createBuffer()
    );
    let output: Region[] = [argFrameLengthRegion];
    let descriptionRegion = descriptionUtils.createDescriptionRegion(
        this.descriptionLineList
    );
    if (descriptionRegion !== null) {
        output.push(descriptionRegion);
    }
    if (this.functionImplementation !== null) {
        let tempRegionList = this.functionImplementation.createSubregions();
        for (let region of tempRegionList) {
            output.push(region);
        }
    }
    return output;
}

FunctionDefinition.prototype.getTitleSuffix = function(): string {
    return null;
}

export interface PrivateFunctionDefinition extends PrivateFunctionDefinitionInterface {}

export class PrivateFunctionDefinition extends FunctionDefinition {
    constructor(identifier: Identifier, lineList: AssemblyLine[]) {
        super(identifier, lineList, REGION_TYPE.privFunc);
        this.functionImplementation = new FunctionImplementation(this);
    }
}

PrivateFunctionDefinition.prototype.getTitlePrefix = function(): string {
    return "Private";
}

export interface ArgPermFunctionDefinition extends ArgPermFunctionDefinitionInterface {}

export abstract class ArgPermFunctionDefinition extends FunctionDefinition {
    
}

ArgPermFunctionDefinition.prototype.createSubregions = function(): Region[] {
    let output = FunctionDefinition.prototype.createSubregions.call(this);
    let nameRegion = new AtomicRegion(REGION_TYPE.name, Buffer.from(this.identifier.name));
    let argPermsRegion = this.getArgPermsRegion();
    output.push(nameRegion);
    if (argPermsRegion !== null) {
        output.push(argPermsRegion);
    }
    return output;
}

ArgPermFunctionDefinition.prototype.getArgPermsRegion = function(): Region {
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

export class PublicFunctionDefinition extends ArgPermFunctionDefinition {
    constructor(
        identifier: Identifier,
        interfaceIndexExpression: Expression,
        arbiterIndexExpression: Expression,
        lineList: AssemblyLine[]
    ) {
        super(identifier, lineList, REGION_TYPE.pubFunc);
        this.interfaceIndexExpression = interfaceIndexExpression;
        this.arbiterIndexExpression = arbiterIndexExpression;
        this.functionImplementation = new FunctionImplementation(this);
    }
}

PublicFunctionDefinition.prototype.getTitlePrefix = function(): string {
    return "Public";
}

PublicFunctionDefinition.prototype.getTitleSuffix = function(): string {
    var output = this.interfaceIndexExpression.getDisplayString();
    if (this.arbiterIndexExpression !== null) {
        output += ", " + this.arbiterIndexExpression.getDisplayString();
    }
    return output;
}

PublicFunctionDefinition.prototype.createSubregions = function(): Region[] {
    let output = ArgPermFunctionDefinition.prototype.createSubregions.call(this);
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

export interface GuardFunctionDefinition extends GuardFunctionDefinitionInterface {}

export class GuardFunctionDefinition extends ArgPermFunctionDefinition {
    constructor(
        identifier: Identifier,
        interfaceIndexExpression: Expression,
        lineList: AssemblyLine[]
    ) {
        super(identifier, lineList, REGION_TYPE.guardFunc);
        this.interfaceIndexExpression = interfaceIndexExpression;
        this.functionImplementation = new FunctionImplementation(this);
    }
}

GuardFunctionDefinition.prototype.getTitlePrefix = function(): string {
    return "Guard";
}

GuardFunctionDefinition.prototype.getTitleSuffix = function(): string {
    return this.interfaceIndexExpression.getDisplayString();
}

GuardFunctionDefinition.prototype.createSubregions = function(): Region[] {
    let output = ArgPermFunctionDefinition.prototype.createSubregions.call(this);
    let tempBuffer = Buffer.alloc(4);
    tempBuffer.writeUInt32LE(this.interfaceIndexExpression.evaluateToNumber(), 0);
    output.push(new AtomicRegion(REGION_TYPE.guardFuncAttrs, tempBuffer));
    return output;
}

export interface InterfaceFunctionDefinition extends InterfaceFunctionDefinitionInterface {}

export class InterfaceFunctionDefinition extends ArgPermFunctionDefinition {
    constructor(identifier: Identifier, arbiterIndexExpression: Expression, lineList: AssemblyLine[]) {
        super(identifier, lineList, REGION_TYPE.ifaceFunc);
        this.arbiterIndexExpression = arbiterIndexExpression;
    }
}

InterfaceFunctionDefinition.prototype.getTitlePrefix = function(): string {
    return "Interface";
}

InterfaceFunctionDefinition.prototype.getTitleSuffix = function(): string {
    if (this.arbiterIndexExpression === null) {
        return null;
    }
    return this.arbiterIndexExpression.getDisplayString();
}

InterfaceFunctionDefinition.prototype.createSubregions = function(): Region[] {
    let output = ArgPermFunctionDefinition.prototype.createSubregions.call(this);
    let tempBuffer = Buffer.alloc(4);
    let tempNumber;
    if (this.arbiterIndexExpression === null) {
        tempNumber = -1;
    } else {
        tempNumber = this.arbiterIndexExpression.evaluateToNumber();
    }
    tempBuffer.writeInt32LE(tempNumber, 0);
    output.push(new AtomicRegion(REGION_TYPE.ifaceFuncAttrs, tempBuffer));
    return output;
}


