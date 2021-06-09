export async function commandExists(command: string) {
  const status = await Deno.run({
    cmd: ["command", "-v", command],
    stdout: "null",
    stdin: "null",
  }).status();
  return status.success;
}
