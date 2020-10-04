import Fragment from "./engine";
import Path from "path";

let instance = new Fragment(Path.join(process.cwd(), "src/fragment/main.fr"));
instance.run();
