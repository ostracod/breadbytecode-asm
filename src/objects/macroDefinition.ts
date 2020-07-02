
import {MacroDefinition as MacroDefinitionInterface, Identifier, Expression, AssemblyLine} from "models/objects";
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
    
    invoke(argList: Expression[], macroInvocationId: number): AssemblyLine[] {
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
    
    getDisplayString(): string {
        var tempTextList = [];
        var tempIdentifierTextList = [];
        var index = 0;
        while (index < this.argIdentifierList.length) {
            var tempIdentifier = this.argIdentifierList[index];
            tempIdentifierTextList.push(tempIdentifier.getDisplayString());
            index += 1;
        }
        let tempText = this.name;
        if (tempIdentifierTextList.length > 0) {
            tempText += " " + tempIdentifierTextList.join(", ");
        }
        tempTextList.push(tempText + ":");
        tempTextList.push(lineUtils.getLineListDisplayString(this.lineList, 1));
        return tempTextList.join("\n");
    }
}


