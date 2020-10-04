import { readFileSync, stat } from "fs";
import { Grammar, Parser } from "nearley";
import Language from "./grammar";
import Path from "path";
import chalk from "chalk";
import { Statement } from "typescript";

namespace Use {
  export interface Statement {
    operation: "use_statement";
    source: string;
    use: string[];
    position: Misc.Position;
  }
}

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
    name: string;
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

  export type AllRepresentation =
    | FragmentIntRepresentaion
    | FragmentDoubleRepresentaion
    | FragmentStringRepresentaion
    | FragmentBooleanRepresentaion
    | FragmentFunctionRepresentaion
    | FragmentArrayRepresentaion
    | FragmentRecordRepresentaion
    | FragmentArkRepresentaion;

  export interface FragmentIntRepresentaion {
    sort: Misc.Sort<"Int">;
    value: number;
  }
  export interface FragmentDoubleRepresentaion {
    sort: Misc.Sort<"Double">;
    value: number;
  }
  export interface FragmentStringRepresentaion {
    sort: Misc.Sort<"String">;
    value: string;
  }
  export interface FragmentBooleanRepresentaion {
    sort: Misc.Sort<"Boolean">;
    value: boolean;
  }
  export interface FragmentFunctionRepresentaion {
    sort: Misc.Sort<"Function">;
    body: Statement.All[];
    parameters: any[];
  }
  export interface FragmentArrayRepresentaion {
    sort: Misc.Sort<"Array">;
    values: AllRepresentation[];
  }
  export interface FragmentRecordRepresentaion {
    sort: Misc.Sort<"Record">;
    values: { key: AllRepresentation; value: AllRepresentation }[];
  }
  export interface FragmentArkRepresentaion {
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
  uses: Use.Statement[];
  program: Statement.All[];
  provides: Expression.All;
}

export default class Fragment {
  file: string;
  content: string;
  parsedPath: Path.ParsedPath;
  parsedContent: IFragmentProgram;
  parser: Parser;
  dependencies: Fragment[];
  frame: Misc.Frame;
  constructor(public path: string, public isArk = false) {
    this.dependencies = [];
    this.frame = {
      Print: {
        sort: { type: "Function", of: { type: "Int" } },
        body: [],
        parameters: []
      },
      JSPort: {
        sort: { type: "Record", of: { type: "Function", of: { type: "Boolean" } } },
        values: [
          {
            key: Fragment.GeneratePrimitive("String", "Length"),
            value: Fragment.GeneratePrimitive("Int", 34)
          }
        ]
      }
    };
    this.parsedPath = Path.parse(path);
    this.file = this.parsedPath.base;
    this.content = readFileSync(path).toString();
    this.parser = new Parser(Grammar.fromCompiled(Language));
    this.parser.feed(this.content);
    this.parsedContent = this.parser.results[0];
    this.resolveDependencies();
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

          // TODO
          if (value.sort.type === "Array") {
            value.sort = statement.sort as Misc.Sort<"Int">;
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
                (value as Primitive.FragmentIntRepresentaion).value += 1;
                break;
              case "decrement":
                (value as Primitive.FragmentIntRepresentaion).value -= 1;
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
            let v = (assignmet as Primitive.FragmentIntRepresentaion).value;
            let s = (value as Primitive.FragmentIntRepresentaion).value;
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
                  (value as Primitive.FragmentIntRepresentaion).value += v;
                } else {
                  exit();
                }
                break;
              case "decrement":
                if (condition("-")) {
                  (value as Primitive.FragmentIntRepresentaion).value -= v;
                } else {
                  exit();
                }
                break;
              case "multiply":
                if (condition("*")) {
                  (value as Primitive.FragmentIntRepresentaion).value *= v;
                } else {
                  exit();
                }
                break;
              case "divide":
                if (condition("/")) {
                  (value as Primitive.FragmentIntRepresentaion).value /= v;
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
            `Variable ${expression.value} is not declared`,
            expression.position
          );
          process.exit();
        }
      case "primitive":
        return this.resolvePrimitive(expression, frame);
      case "index_statement":
        let source = this.resolveExpression(expression.source, frame);

        if (source.sort.type === "Record") {
          let s = source as Primitive.FragmentRecordRepresentaion;
          let index = this.resolveExpression(expression.index, frame);

          if (index.sort.type === "String") {
            let value = s.values.find(
              (value) =>
                (value.key as Primitive.FragmentStringRepresentaion).value ===
                (index as Primitive.FragmentStringRepresentaion).value
            )?.value;
            if (value) {
              return value;
            } else {
              this.error(
                Fragment.ErrorMessage.UndeclaredElement,
                `The element ${
                  (index as Primitive.FragmentStringRepresentaion).value
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
          let s = source as Primitive.FragmentArrayRepresentaion;
          let index = this.resolveExpression(
            expression.index,
            frame
          ) as Primitive.FragmentIntRepresentaion;

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
          let l = left as Primitive.FragmentIntRepresentaion;
          let r = right as Primitive.FragmentIntRepresentaion;
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
          let l = left as Primitive.FragmentStringRepresentaion;
          let r = right as Primitive.FragmentStringRepresentaion;
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
          console.log(expression);
          return { sort: { type: "Int" }, value: 0 };
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
        return { sort: { type: "Record" }, values: [] };
      case "Function":
        return { sort: { type: "Function" } };
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
    let line = this.content.split("\n")[position.line - 1];
    console.log(
      `${chalk.hex("#ff6161").bold("Captured Error:")} ${chalk
        .hex("#bababa")
        .bold(message)}.\n\n${punchline}\n${chalk.hex("#1793ff").bold(line)}\n${
        Array(position.col).join(" ") + "^"
      }\n\n${
        chalk.hex("#888888").bold("Error arose in ") +
        chalk.hex("#1793ff").bold(`${this.file} ${position.line}:${position.col}`)
      }`
    );
  }

  static DiffTypes(sort1: Misc.Sort<Misc.Type>, sort2: Misc.Sort<Misc.Type>): Boolean {
    if (["String", "Boolean", "Int", "Double"].includes(sort1.type)) {
      return sort1.type === sort2.type;
    } else {
      if (sort1.of && sort2.of) {
        if (sort1.type === sort2.type) {
          return Fragment.DiffTypes(sort1.of, sort2.of);
        } else {
          return false;
        }
      } else {
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
    TypeMiscmatch: "There is a type mismatch in given program"
  };
}
