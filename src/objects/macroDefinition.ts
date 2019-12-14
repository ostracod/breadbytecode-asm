
import {MacroDefinition as MacroDefinitionInterface, Identifier, Expression, AssemblyLine} from "models/objects";
import {Assembler} from "objects/assembler";
import {AssemblyError} from "objects/assemblyError";
import {lineUtils} from "utils/lineUtils";
import {IdentifierMap} from "objects/identifier";

export interface MacroDefinition extends MacroDefinitionInterface {}

export class MacroDefinition {
    constructor(name: string, argIdentifierList: Identifier[], lineList: AssemblyLine[]) {
        this.name = name;
        this.argIdentifierList = argIdentifierList;
        this.lineList = lineList;
    }
}

MacroDefinition.prototype.invoke = function(argList: Expression[], macroInvocationId: number): AssemblyLine[] {
    if (argList.length != this.argIdentifierList.length) {
        throw new AssemblyError("Wrong number of macro arguments.");
    }
    var identifierExpressionMap = new IdentifierMap() as IdentifierMap<Expression>;
    var index = 0;
    while (index < this.argIdentifierList.length) {
        var tempIdentifier = this.argIdentifierList[index];
        var tempExpression = argList[index];
        identifierExpressionMap.set(tempIdentifier, tempExpression);
        index += 1;
    }
    var output = lineUtils.copyLines(this.lineList);
    lineUtils.substituteIdentifiersInLines(output, identifierExpressionMap);
    lineUtils.populateMacroInvocationIdInLines(output, macroInvocationId);
    return output;
}

MacroDefinition.prototype.getDisplayString = function(): string {
    var tempTextList = [];
    var tempIdentifierTextList = [];
    var index = 0;
    while (index < this.argIdentifierList.length) {
        var tempIdentifier = this.argIdentifierList[index];
        tempIdentifierTextList.push(tempIdentifier.getDisplayString());
        index += 1;
    }
    tempTextList.push(this.name + " " + tempIdentifierTextList.join(", ") + ":");
    tempTextList.push(lineUtils.getLineListDisplayString(this.lineList, 1));
    return tempTextList.join("\n");
}

Assembler.prototype.extractMacroDefinitions = function(lineList: AssemblyLine[]): AssemblyLine[] {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempArgList = line.argList;
        if (line.directiveName == "MACRO") {
            if (tempArgList.length < 1) {
                throw new AssemblyError("Expected at least 1 argument.");
            }
            var tempNameIdentifier = tempArgList[0].evaluateToIdentifier();
            var tempName = tempNameIdentifier.name;
            var tempIdentifierList = [];
            var index = 1;
            while (index < tempArgList.length) {
                var tempIdentifier = tempArgList[index].evaluateToIdentifier();
                tempIdentifierList.push(tempIdentifier);
                index += 1;
            }
            var tempDefinition = new MacroDefinition(
                tempName,
                tempIdentifierList,
                line.codeBlock
            );
            self.macroDefinitionMap[tempName] = tempDefinition;
            return [];
        }
        return null;
    });
    return tempResult.lineList;
}

Assembler.prototype.getNextMacroInvocationId = function(): number {
    var output = this.nextMacroInvocationId;
    this.nextMacroInvocationId += 1;
    return output;
}

Assembler.prototype.expandMacroInvocations = function(lineList: AssemblyLine[]): {lineList: AssemblyLine[], expandCount: number} {
    var self = this;
    var tempResult = lineUtils.processLines(lineList, function(line) {
        var tempDirectiveName = line.directiveName;
        if (tempDirectiveName in self.macroDefinitionMap) {
            var tempDefinition = self.macroDefinitionMap[tempDirectiveName];
            var macroInvocationId = self.getNextMacroInvocationId();
            return tempDefinition.invoke(line.argList, macroInvocationId);
        }
        return null;
    }, true);
    return {
        lineList: tempResult.lineList,
        expandCount: tempResult.processCount
    };
}


