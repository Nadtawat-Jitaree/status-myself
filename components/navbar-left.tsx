import Link from "next/link";
import { Button } from "./ui/button";

export function NavbarLeft() {
  return (
    <>
    <Link href={"/status-myself/notes"}>Notes</Link>
    </>
  );
}
