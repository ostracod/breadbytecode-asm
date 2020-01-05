
import {NumberType} from "models/delegates";
import {Expression, AssemblyLine, VariableDefinition, ArgNumber, ArgVersionNumber} from "models/objects";

export type ExpressionProcessor = ((expression: Expression) => Expression);

export type LineProcessor = ((line: AssemblyLine) => AssemblyLine[]);

export type NumberTypeClass = (new (...args: any[]) => NumberType);

export type VariableDefinitionClass = (new (...args: any[]) => VariableDefinition);

export type ArgNumeric = (ArgNumber | ArgVersionNumber);


