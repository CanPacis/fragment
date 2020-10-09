import Fragment from "./engine";
import Path from "path";

import FilePort from "./system/file"
import { Port, PortFunction } from "./interface";

const system: PortFunction[] = [FilePort]

let instance = new Fragment(Path.join(process.cwd(), "src/fragment/main.fr"));
instance.run((i: any) => {
	let port: Port[] = []
	system.forEach((file: PortFunction) => {
		port.push(...file(i))
	})
	return port
});
