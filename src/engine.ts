import { readFileSync, stat } from "fs";
import { Grammar, Parser } from "nearley";
import Language from "./grammar";
import Path from "path";
import chalk from "chalk";

namespace Misc {
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
    | "Function"
    | "Boolean"
    | "String"
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

namespace Primitive {
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

namespace Expression {
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

namespace Statement {
  export type All = VariableDefinition | Comment | Expression.All | QuantityModifier | Assign | If;

  export interface Use {
    operation: "use_statement";
    source: string;
    use: string[];
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

interface IFragmentProgram {
  uses: Statement.Use[];
  program: Statement.All[];
  provides: Expression.All;
}

export default class Fragment {
  file: string;
  content: string;
  type: "system" | "file";
  parsedPath: Path.ParsedPath;
  parsedContent: IFragmentProgram;
  parser: Parser;
  dependencies: Fragment[];
  frame: Misc.Frame;
  constructor(public path: string, public isArk = false) {
    this.dependencies = [];
    this.frame = {};
    this.type = "file";

    this.parsedPath = Path.parse(path);
    this.file = this.parsedPath.base;
    this.content = readFileSync(path).toString();
    this.parser = new Parser(Grammar.fromCompiled(Language));
    this.parser.feed(this.content);
    this.parsedContent = this.parser.results[0];
  }

  resolveProgram() {
    if (this.type === "system") {
      this.frame.JSPort = {
        sort: { type: "Record", of: { type: "Occult" } },
        values: Fragment.Port
      };
    }

    this.resolveDependencies();
    this.parsedContent.program.forEach((statement) => {
      this.resolveStatement(statement, this.frame);
    });
  }

  resolveDependencies() {
    this.parsedContent.uses.forEach((dependency) => {
      if (dependency.source === "system") {
        console.log("system import");
      } else {
        this.dependencies.push(new Fragment(Path.join(this.parsedPath.dir, dependency.source)));
      }
    });
  }

  resolveStatement(statement: Statement.All, frame: Misc.Frame): Primitive.AllRepresentation {
    let exporessions = ["arithmetic", "function_call", "index_statement", "primitive", "reference"];
    if (exporessions.includes(statement.operation)) {
      return this.resolveExpression(statement as Expression.All, frame);
    } else {
      switch (statement.operation) {
        case "comment":
          return Fragment.GeneratePrimitive("Int", 0);
        case "variable_definition":
          var value = this.resolveExpression(statement.value, frame);

          if (value.sort.type === "Array") {
            let values = (statement.value as Primitive.FragmentArray).values;

            values.forEach((element) => {
              let e = this.resolveExpression(element, frame);

              if (e.sort.type === statement.sort.of?.type) {
                value.sort = statement.sort as Misc.Sort<"Array">;
              } else {
                this.error(
                  Fragment.ErrorMessage.TypeMiscmatch,
                  `Type '${e.sort.type}' is not assignable to type '${statement.sort.type}.${statement.sort.of?.type}'`,
                  element.position as Misc.Position
                );
                process.exit();
              }
            });
          } else if (value.sort.type === "Record") {
            let used: string[] = [];
            let values = (statement.value as Primitive.FragmentRecord).values;
            if (values.length > 0) {
              values.forEach((element) => {
                let e = this.resolveExpression(element.value, frame);

                if (e.sort.type === statement.sort.of?.type) {
                  let key = (element.key as Primitive.FragmentString).value;
                  if (used.includes(key)) {
                    this.error(
                      Fragment.ErrorMessage.DuplicateElement,
                      `Records cannot have duplicate keys`,
                      element.key.position
                    );
                    process.exit();
                  } else {
                    used.push(key);
                    value.sort = statement.sort as Misc.Sort<"Record">;
                  }
                } else {
                  this.error(
                    Fragment.ErrorMessage.TypeMiscmatch,
                    `Type '${e.sort.type}' is not assignable to type '${statement.sort.type}.${statement.sort.of?.type}'`,
                    element.value.position as Misc.Position
                  );
                  process.exit();
                }
              });
            } else {
              value.sort = statement.sort as Misc.Sort<"Record">;
            }
          } else if (value.sort.type === "Function") {
            value.sort = statement.sort as Misc.Sort<"Function">;
          }

          if (Fragment.DiffTypes(statement.sort, value.sort)) {
            frame[statement.name] = value;
            return Fragment.GeneratePrimitive("Int", 0);
          } else {
            this.error(
              Fragment.ErrorMessage.TypeMiscmatch,
              `Type '${value.sort.type}' is not assignable to type '${statement.sort.type}'`,
              statement.sort.position as Misc.Position
            );
            process.exit();
          }
        case "quantity_modifier":
          var value = this.resolveExpression(statement.statement, frame);
          if (value.sort.type === "Int" || value.sort.type === "Double") {
            switch (statement.type) {
              case "increment":
                ((value as unknown) as Primitive.FragmentIntRepresentation).value += 1;
                break;
              case "decrement":
                ((value as unknown) as Primitive.FragmentIntRepresentation).value -= 1;
                break;
            }
          } else {
            this.error(
              Fragment.ErrorMessage.TypeMiscmatch,
              `Type '${value.sort.type}' cannot be incremented`,
              statement.statement.position as Misc.Position
            );
            process.exit();
          }
          return Fragment.GeneratePrimitive("Int", 0);
        case "assign_statement":
          var value = this.resolveExpression(statement.statement, frame);
          var assignmet = this.resolveExpression(statement.value, frame);
          if (
            (value.sort.type === "Int" && assignmet.sort.type === "Int") ||
            (value.sort.type === "Double" && assignmet.sort.type === "Double")
          ) {
            let v = ((assignmet as unknown) as Primitive.FragmentIntRepresentation).value;
            let s = ((value as unknown) as Primitive.FragmentIntRepresentation).value;
            let condition = (operation: "+" | "-" | "*" | "/") => {
              switch (operation) {
                case "+":
                  return value.sort.type === "Int" ? (s + v) % 1 === 0 : (s + v) % 1 !== 0;
                case "-":
                  return value.sort.type === "Int" ? (s - v) % 1 === 0 : (s - v) % 1 !== 0;
                case "*":
                  return value.sort.type === "Int" ? (s * v) % 1 === 0 : (s * v) % 1 !== 0;
                case "/":
                  return value.sort.type === "Int" ? (s / v) % 1 === 0 : (s / v) % 1 !== 0;
              }
            };

            let exit = () => {
              this.error(
                Fragment.ErrorMessage.TypeMiscmatch,
                `Type '${value.sort.type}' cannot be reassigned with type '${
                  value.sort.type === "Double" ? "Int" : "Double"
                }'`,
                statement.statement.position as Misc.Position
              );
              process.exit();
            };

            switch (statement.type) {
              case "increment":
                if (condition("+")) {
                  ((value as unknown) as Primitive.FragmentIntRepresentation).value += v;
                } else {
                  exit();
                }
                break;
              case "decrement":
                if (condition("-")) {
                  ((value as unknown) as Primitive.FragmentIntRepresentation).value -= v;
                } else {
                  exit();
                }
                break;
              case "multiply":
                if (condition("*")) {
                  ((value as unknown) as Primitive.FragmentIntRepresentation).value *= v;
                } else {
                  exit();
                }
                break;
              case "divide":
                if (condition("/")) {
                  ((value as unknown) as Primitive.FragmentIntRepresentation).value /= v;
                } else {
                  exit();
                }
            }
          } else {
            this.error(
              Fragment.ErrorMessage.TypeMiscmatch,
              `Type '${value.sort.type}' cannot be reassigned with type '${assignmet.sort.type}'`,
              statement.statement.position as Misc.Position
            );
            process.exit();
          }
          return Fragment.GeneratePrimitive("Int", 0);
        case "if_statement":
          let condition = this.resolveExpression(statement.condition, frame);

          if (condition.sort.type === "Boolean") {
            statement.body.forEach((statement) => {
              this.resolveStatement(statement, frame);
            });
          } else {
            this.error(
              Fragment.ErrorMessage.TypeMiscmatch,
              `Cannot perform if statement with a type '${condition.sort.type}'`,
              statement.condition.position
            );
            process.exit();
          }
          return Fragment.GeneratePrimitive("Int", 0);
        default:
          this.error(
            Fragment.ErrorMessage.UnknownStatement,
            `Statement '${statement.operation}' is not known`,
            { line: 1, col: 1 }
          );
          process.exit();
      }
    }
  }

  resolveExpression(expression: Expression.All, frame: Misc.Frame): Primitive.AllRepresentation {
    switch (expression.operation) {
      case "reference":
        if (frame[expression.value]) {
          return frame[expression.value];
        } else {
          this.error(
            Fragment.ErrorMessage.UndeclaredVariable,
            `Variable '${expression.value}' is not declared`,
            expression.position
          );
          process.exit();
        }
      case "primitive":
        return this.resolvePrimitive(expression, frame);
      case "index_statement":
        let source = this.resolveExpression(expression.source, frame);

        if (source.sort.type === "Record") {
          let s = source as Primitive.FragmentRecordRepresentation;
          let index = this.resolveExpression(expression.index, frame);

          if (index.sort.type === "String") {
            let value = s.values.find(
              (value) =>
                (value.key as Primitive.FragmentStringRepresentation).value ===
                (index as Primitive.FragmentStringRepresentation).value
            )?.value;
            if (value) {
              return value;
            } else {
              this.error(
                Fragment.ErrorMessage.UndeclaredElement,
                `The element ${
                  (index as Primitive.FragmentStringRepresentation).value
                } is absent in record ${(expression.source as Primitive.FragmentString).value}`,
                expression.index.position
              );
              process.exit();
            }
          } else {
            this.error(
              Fragment.ErrorMessage.UnindexableType,
              `Type of 'Record' cannot be indexed with type '${index.sort.type}'`,
              expression.index.position
            );
            process.exit();
          }
        } else if (source.sort.type === "Array") {
          let s = source as Primitive.FragmentArrayRepresentation;
          let index = (this.resolveExpression(
            expression.index,
            frame
          ) as unknown) as Primitive.FragmentIntRepresentation;

          if (index.sort.type === "Int") {
            let value = s.values[index.value];
            if (value) {
              return value;
            } else {
              this.error(
                Fragment.ErrorMessage.UndeclaredElement,
                `The given index is out of bounds`,
                expression.index.position
              );
              process.exit();
            }
          } else {
            this.error(
              Fragment.ErrorMessage.UnindexableType,
              `Type of 'Array' cannot be indexed with type '${index.sort.type}'`,
              expression.index.position
            );
            process.exit();
          }
        } else {
          process.exit();
        }
      case "arithmetic":
        let left = this.resolveExpression(expression.left, frame);
        let right = this.resolveExpression(expression.right, frame);

        if (
          (left.sort.type === "Int" && right.sort.type === "Int") ||
          (left.sort.type === "Double" && right.sort.type === "Double")
        ) {
          let l = (left as unknown) as Primitive.FragmentIntRepresentation;
          let r = (right as unknown) as Primitive.FragmentIntRepresentation;
          switch (expression.type) {
            case "addition":
              return Fragment.GeneratePrimitive(left.sort.type, l.value + r.value);
            case "subtraction":
              return Fragment.GeneratePrimitive(left.sort.type, l.value - r.value);
            case "multiplication":
              return Fragment.GeneratePrimitive(left.sort.type, l.value * r.value);
            case "division":
              return Fragment.GeneratePrimitive(left.sort.type, l.value / r.value);
            case "exponent":
              return Fragment.GeneratePrimitive(left.sort.type, Math.pow(l.value, r.value));
          }
        } else if (left.sort.type === "String" && right.sort.type === "String") {
          let l = left as Primitive.FragmentStringRepresentation;
          let r = right as Primitive.FragmentStringRepresentation;
          if (expression.type === "addition") {
            return Fragment.GeneratePrimitive("String", l.value + r.value);
          } else {
            this.error(
              Fragment.ErrorMessage.UnperformableArithmetic,
              `Arithmetic ${expression.type} between ${left.sort.type} and ${right.sort.type} is inoperable`,
              expression.left.position
            );
            process.exit();
          }
        } else {
          this.error(
            Fragment.ErrorMessage.UnperformableArithmetic,
            `Arithmetic ${expression.type} between ${left.sort.type} and ${right.sort.type} is inoperable`,
            expression.left.position
          );
          process.exit();
        }
      case "function_call":
        let name = this.resolveExpression(expression.name, frame);
        if (name.sort.type === "Function") {
          let name = this.resolveExpression(
            expression.name,
            frame
          ) as Primitive.FragmentFunctionRepresentation;

          let args = expression.arguments.map((arg) => this.resolveExpression(arg, frame));
          if ((name as Primitive.NativeFunctionRepresentation).native) {
            return (name as Primitive.NativeFunctionRepresentation).cb(...args);
          } else {
            let subframe = { ...frame };
            name.parameters.forEach((param, i) => {
              if (args[i] !== undefined) {
                if (Fragment.DiffTypes(args[i].sort, param.sort) || param.sort.type === "Occult") {
                  subframe = { ...subframe, [param.value]: args[i] };
                } else {
                  this.error(
                    Fragment.ErrorMessage.TypeMiscmatch,
                    `Type '${args[i].sort.type}' is not valid for type '${param.sort.type}' in function argument for '${param.value}'`,
                    expression.arguments[i].position
                  );
                  process.exit();
                }
              } else {
                if (param.isOptional === false) {
                  this.error(
                    Fragment.ErrorMessage.AnticipatedArgument,
                    `Function you are trying to invoke needs an argument for '${param.value}'`,
                    expression.name.position
                  );
                  process.exit();
                }
              }
            });

            name.body.forEach((statement) => {
              this.resolveStatement(statement, subframe);
            });

            if (name.sort.of?.type === "Occult") {
              return { sort: { type: "Occult" } };
            } else {
              if (name.provides) {
                let provide = this.resolveExpression(name.provides, subframe);
                if (provide) {
                  if (name.sort.of?.type === provide.sort.type) {
                    return provide;
                  } else {
                    this.error(
                      Fragment.ErrorMessage.TypeMiscmatch,
                      `A function of '${name.sort.of?.type}' cannot provide type '${provide.sort.type}'`,
                      name.provides.position
                    );
                    process.exit();
                  }
                }
              } else {
                this.error(
                  Fragment.ErrorMessage.TypeMiscmatch,
                  `A function of '${name.sort.of?.type}' should provide a type`,
                  expression.name.position
                );
                process.exit();
              }
            }
          }
        } else {
          this.error(
            Fragment.ErrorMessage.UncallableReference,
            `The type ${name.sort.type} is not a function I can invoke`,
            expression.name.position
          );
          process.exit();
        }
    }
  }

  resolvePrimitive(primitive: Primitive.All, frame: Misc.Frame): Primitive.AllRepresentation {
    switch (primitive.type) {
      case "String":
        return { sort: { type: "String" }, value: primitive.value };
      case "Int":
        return { sort: { type: "Int" }, value: parseInt(primitive.value) };
      case "Double":
        return { sort: { type: "Double" }, value: parseFloat(primitive.value) };
      case "Boolean":
        return { sort: { type: "Boolean" }, value: primitive.value === "true" };
      case "Array":
        return {
          sort: { type: "Array" },
          values: (primitive as Primitive.FragmentArray).values.map((m) =>
            this.resolveExpression(m, frame)
          )
        };
      case "Record":
        return {
          sort: { type: "Record" },
          values: (primitive as Primitive.FragmentRecord).values.map((e) => ({
            key: this.resolveExpression(e.key, frame),
            value: this.resolveExpression(e.value, frame)
          }))
        };
      case "Function":
        return {
          sort: { type: "Function" },
          body: primitive.body,
          parameters: primitive.parameters,
          provides: primitive.provides
        } as Primitive.FragmentFunctionRepresentation;
      default:
        this.error(
          Fragment.ErrorMessage.UnknownType,
          `Type '${primitive.type}' is not known`,
          primitive.position
        );
        process.exit();
    }
  }

  error(message: string, punchline: string, position: Misc.Position) {
    // console.log(position, punchline);

    let line = this.content.split("\n")[position.line - 1];
    let t = (line.match(/\t/g) || []).length;
    let spaces = Array(position.col - (t > 0 ? t + 1 : 0)).join(" ");
    let tabs = Array(t * 8).join(" ");
    console.log(
      `${chalk.hex("#ff6161").bold("Captured Error:")} ${chalk
        .hex("#bababa")
        .bold(message)}.\n\n${punchline}\n${chalk.hex("#888888").bold(line)}\n${
        tabs + spaces + "^"
      }\n\n${
        chalk.hex("#888888").bold("Error arose in ") +
        chalk.hex("#1793ff").bold(`${this.file} ${position.line}:${position.col}`)
      }`
    );
  }

  static DiffTypes(sort1: Misc.Sort<Misc.Type>, sort2: Misc.Sort<Misc.Type>): Boolean {
    if (["String", "Boolean", "Int", "Double", "Occult"].includes(sort1.type)) {
      if (
        (sort1.type === "Occult" && sort2.type !== "Occult") ||
        (sort2.type === "Occult" && sort1.type !== "Occult")
      ) {
        return true;
      }
      return sort1.type === sort2.type;
    } else {
      if (sort1.of && sort2.of) {
        if (sort1.type === sort2.type) {
          return Fragment.DiffTypes(sort1.of, sort2.of);
        } else {
          return false;
        }
      } else {
        if (
          (sort1.of?.type === "Occult" && sort2.of?.type !== "Occult") ||
          (sort2.of?.type === "Occult" && sort1.of?.type !== "Occult")
        ) {
          return true;
        }
        return false;
      }
    }
  }

  static GeneratePrimitive(type: Misc.Type, value: any): Primitive.AllRepresentation {
    return { sort: { type }, value };
  }

  static ErrorMessage = {
    UnknownType: "Unknown type is found while resolving the primitive",
    UnknownStatement: "Unknown statement is found while resolving the statement",
    UndeclaredVariable: "Undeclared variable is found while resolving an expression",
    UnindexableType: "Cannot index this construct with given type",
    UndeclaredElement: "Undeclared element is found while resolving an expression",
    UnperformableArithmetic: "Cannot perform arithmetic between these types",
    UncallableReference: "Referenced variable is uncallable",
    TypeMiscmatch: "There is a type mismatch in given program",
    DuplicateElement: "There is duplicate of an element in given program",
    AnticipatedArgument: "A function anticipated an argument"
  };

  static SerializePrimitive(primitive: Primitive.AllRepresentation): string {
    switch (primitive.sort.type) {
      case "Int":
        return chalk
          .hex("#1793ff")
          .bold(((primitive as unknown) as Primitive.FragmentIntRepresentation).value.toString());
      case "Double":
        return chalk
          .hex("#1793ff")
          .bold((primitive as Primitive.FragmentDoubleRepresentation).value.toString());
      case "String":
        return `${chalk
          .hex("#b200ed")
          .bold((primitive as Primitive.FragmentStringRepresentation).value)}`;
      case "Boolean":
        return chalk
          .hex("#0c9400")
          .bold((primitive as Primitive.FragmentBooleanRepresentation).value.toString());
      case "Array":
        return `[${(primitive as Primitive.FragmentArrayRepresentation).values
          .map((v) => Fragment.SerializePrimitive(v))
          .join(", ")}]`;
      case "Record":
        return `{ ${(primitive as Primitive.FragmentRecordRepresentation).values
          .map(
            (v) => `${Fragment.SerializePrimitive(v.key)} : ${Fragment.SerializePrimitive(v.value)}`
          )
          .join(", ")} }`;
      default:
        return "";
    }
  }

  static Port = [
    {
      key: Fragment.GeneratePrimitive("String", "Print"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Occult" } },
        cb(...input: Primitive.AllRepresentation[]) {
          let message: string[] = [];
          input.forEach((msg) => {
            message.push(Fragment.SerializePrimitive(msg));
          });
          console.log(message.join(" "));
        }
      } as unknown) as Primitive.NativeFunctionRepresentation
    },
    {
      key: Fragment.GeneratePrimitive("String", "Lt"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Boolean" } },
        cb(n1: Primitive.FragmentNumberRepresentation, n2: Primitive.FragmentNumberRepresentation) {
          return n1.value < n2.value
            ? Fragment.GeneratePrimitive("Boolean", true)
            : Fragment.GeneratePrimitive("Boolean", false);
        }
      } as unknown) as Primitive.NativeFunctionRepresentation
    },
    {
      key: Fragment.GeneratePrimitive("String", "Length"),
      value: ({
        body: [],
        parameters: [],
        provides: {},
        native: true,
        sort: { type: "Function", of: { type: "Int" } },
        cb(array: Primitive.FragmentArrayRepresentation) {
          return Fragment.GeneratePrimitive("Int", array.values.length);
        }
      } as unknown) as Primitive.NativeFunctionRepresentation
    }
  ];
}
