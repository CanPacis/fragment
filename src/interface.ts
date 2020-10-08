export namespace Misc {
  export interface Position {
    line: number;
    col: number;
  }

  export interface Frame {
    [key: string]: Primitive.AllRepresentation;
  }

  export interface Sort<T extends Type> {
    type: T | Type;
    of?: Sort<Type>;
    position?: Position;
  }

  export type Type =
    | "String"
    | "Boolean"
    | "Function"
    | "Int"
    | "Double"
    | "Array"
    | "Record"
    | "Ark"
    | "Occult";

  export interface Parameter {
    sort: Sort<Type>;
    value: string;
    isOptional: boolean;
  }
}

export namespace Primitive {
  export type All =
    | FragmentInt
    | FragmentDouble
    | FragmentString
    | FragmentBoolean
    | FragmentFunction
    | FragmentArray
    | FragmentRecord
    | FragmentArk;

  export interface Operation {
    operation: "primitive";
  }

  export interface FragmentInt extends Operation {
    type: "Int";
    value: string;
    position: Misc.Position;
  }
  export interface FragmentDouble extends Operation {
    type: "Double";
    value: string;
    position: Misc.Position;
  }
  export interface FragmentString extends Operation {
    type: "String";
    value: string;
    position: Misc.Position;
  }
  export interface FragmentBoolean extends Operation {
    type: "Boolean";
    value: string;
    position: Misc.Position;
  }
  export interface FragmentFunction extends Operation {
    type: "Function";
    parameters: Misc.Parameter[];
    body: Statement.All[];
    provides: Expression.All;
    position: Misc.Position;
  }
  export interface FragmentArray extends Operation {
    type: "Array";
    values: All[];
    position: Misc.Position;
  }
  export interface FragmentRecord extends Operation {
    type: "Record";
    values: { key: All; value: All }[];
    position: Misc.Position;
  }
  export interface FragmentArk extends IFragmentProgram, Operation {
    type: "Ark";
    position: Misc.Position;
  }

  export type FragmentNumberRepresentation =
    | FragmentIntRepresentation
    | FragmentDoubleRepresentation;

  export type AllRepresentation =
    | FragmentArrayRepresentation
    | FragmentDoubleRepresentation
    | FragmentStringRepresentation
    | FragmentBooleanRepresentation
    | FragmentFunctionRepresentation
    | FragmentArrayRepresentation
    | FragmentRecordRepresentation
    | FragmentArkRepresentation
    | NativeFunctionRepresentation;

  export interface NativeFunctionRepresentation {
    sort: Misc.Sort<"Function">;
    body: Statement.All[];
    parameters: Misc.Parameter[];
    provides: Expression.All;
    native: true;
    cb: Function;
  }

  export interface FragmentIntRepresentation {
    sort: Misc.Sort<"Int">;
    value: number;
  }
  export interface FragmentDoubleRepresentation {
    sort: Misc.Sort<"Double">;
    value: number;
  }
  export interface FragmentStringRepresentation {
    sort: Misc.Sort<"String">;
    value: string;
  }
  export interface FragmentBooleanRepresentation {
    sort: Misc.Sort<"Boolean">;
    value: boolean;
  }
  export interface FragmentFunctionRepresentation {
    sort: Misc.Sort<"Function">;
    body: Statement.All[];
    parameters: Misc.Parameter[];
    provides: Expression.All;
  }
  export interface FragmentArrayRepresentation {
    sort: Misc.Sort<"Array">;
    values: AllRepresentation[];
  }
  export interface FragmentRecordRepresentation {
    sort: Misc.Sort<"Record">;
    values: { key: AllRepresentation; value: AllRepresentation }[];
  }
  export interface FragmentArkRepresentation {
    sort: Misc.Sort<"Ark">;
  }
}

export namespace Expression {
  export type All = Reference | Primitive.All | Index | Arithmetic | FunctionCall;

  export interface Reference {
    operation: "reference";
    value: string;
    position: Misc.Position;
  }

  export interface Index {
    operation: "index_statement";
    source: All;
    index: All;
    position: Misc.Position;
  }

  export interface Arithmetic {
    operation: "arithmetic";
    type: "addition" | "subtraction" | "multiplication" | "division" | "exponent";
    left: Expression.All;
    right: Expression.All;
    position: Misc.Position;
  }

  export interface FunctionCall {
    operation: "function_call";
    name: All;
    arguments: All[];
    position: Misc.Position;
  }
}

export namespace Statement {
  export type All = VariableDefinition | Comment | Expression.All | QuantityModifier | Assign | If;

  export interface Use {
    operation: "use_statement";
    source: string;
    use: string[] | "All";
    position: Misc.Position;
  }

  export interface VariableDefinition {
    operation: "variable_definition";
    sort: Misc.Sort<Misc.Type>;
    name: string;
    value: Expression.All;
  }

  export interface Comment {
    operation: "comment";
    position: Misc.Position;
  }

  export interface QuantityModifier {
    operation: "quantity_modifier";
    type: "increment" | "decrement";
    statement: Expression.Reference;
  }

  export interface Assign {
    operation: "assign_statement";
    type: "increment" | "decrement" | "multiply" | "divide";
    statement: Expression.Reference;
    value: Expression.All;
  }

  export interface If {
    operation: "if_statement";
    condition: Expression.All;
    provides: Expression.All;
    body: Statement.All[];
    position: Misc.Position;
  }
}

export interface IFragmentProgram {
  uses: Statement.Use[];
  program: Statement.All[];
  provides: Expression.All;
}