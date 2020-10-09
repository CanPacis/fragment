import { readFileSync } from "fs";
import Fragment, { FragmentError } from "../engine";
import { Primitive, Expression } from "../interface";
import Path from "path";

const FilePort = (i: Fragment) => {
  return [
    {
      key: Fragment.GeneratePrimitive("String", "ReadFile"),
      value: Fragment.GeneratePrimitive(
        "Function",
        (
          [path]: Primitive.FragmentStringRepresentation[],
          expression: Expression.FunctionCall,
          args: Primitive.AllRepresentation[]
        ) => {
          try {
            let file = readFileSync(Path.join(i.parsedPath.dir, path.value)).toString();
            return Fragment.GeneratePrimitive("String", file);
          } catch (error) {
            switch (error.code) {
              // case "ENOENT":
              //   new FragmentError(
              //     i,
              //     Fragment.ErrorMessage.UnableToFindPath,
              //     `Unable to resolve path '${Fragment.SerializePrimitive(args[0])}'`,
              //     expression.arguments[0].position
              //   ).throw();
              //   break;
              default:
                console.log(expression)
                new FragmentError(
                  i,
                  Fragment.ErrorMessage.UnknownError,
                  `We honestly do not know what is wrong`,
                  expression.name.position
                ).throw();
                break;
            }
            process.exit();
          }
        }
      ),
    },
  ];
};

export default FilePort;
